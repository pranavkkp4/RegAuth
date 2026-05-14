import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.AGENT_SERVER_PORT ?? 3001);
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const WORKFLOWS = new Set(['classify', 'author', 'isolate', 'validate']);
const CATEGORIES = [
  'Data fixture drift',
  'Environment readiness',
  'Assertion contract drift',
  'Framework lifecycle fault',
  'Product regression candidate',
  'Unclassified failure',
];

loadLocalEnv();

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const envText = readFileSync(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function buildSystemBlocks() {
  return [
    {
      type: 'text',
      text: [
        '<role>',
        'You are the RegAuth failure triage engine for a Claude Code and Karate regression workflow.',
        'Classify failures from logs, produce engineer-reviewable recommendations, and never claim a product regression without evidence.',
        '</role>',
        '<operating_rules>',
        'Use concise, deterministic analysis.',
        'Separate evidence from hypothesis.',
        'Prefer isolated Karate setup, owned data, reproducible validation, and CI-gated review.',
        'Return your answer only by calling the provided emit_regauth_triage tool.',
        '</operating_rules>',
      ].join('\n'),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: [
        '<taxonomy_reference>',
        '<category name="Data fixture drift">Mutable cards, accounts, tokens, PAN pools, expired or exhausted fixtures, or test data not owned by the scenario.</category>',
        '<category name="Environment readiness">Timeouts, 503s, dependency unavailability, connection failures, health check gaps, or transient latency.</category>',
        '<category name="Assertion contract drift">Expected versus actual mismatches, schema changes, status assertions, or payload contract movement.</category>',
        '<category name="Framework lifecycle fault">Karate, Java, hook, beforeFeature, callonce, setup utility, or lifecycle failures before the product path is proven.</category>',
        '<category name="Product regression candidate">Authorization behavior, ISO 8583, auth response codes, or declined/approved mismatches with prior known-good evidence.</category>',
        '<category name="Unclassified failure">Insufficient evidence for a reliable taxonomy class.</category>',
        '</taxonomy_reference>',
      ].join('\n'),
      cache_control: { type: 'ephemeral' },
    },
  ];
}

function buildTools() {
  return [
    {
      name: 'emit_regauth_triage',
      description: 'Emit a structured RegAuth failure triage result for the React console.',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: [
          'category',
          'confidence',
          'signals',
          'hypothesis',
          'slashCommand',
          'recommendation',
          'karateSketch',
          'validationPlan',
        ],
        properties: {
          category: {
            type: 'string',
            enum: CATEGORIES,
          },
          confidence: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          signals: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: {
              type: 'string',
              minLength: 1,
            },
          },
          hypothesis: {
            type: 'string',
            minLength: 1,
          },
          slashCommand: {
            type: 'string',
            minLength: 1,
          },
          recommendation: {
            type: 'string',
            minLength: 1,
          },
          karateSketch: {
            type: 'string',
            minLength: 1,
          },
          validationPlan: {
            type: 'array',
            minItems: 3,
            maxItems: 6,
            items: {
              type: 'string',
              minLength: 1,
            },
          },
        },
      },
      cache_control: { type: 'ephemeral' },
    },
  ];
}

function temperatureForWorkflow(workflow) {
  if (workflow === 'author') {
    return 0.2;
  }

  return 0;
}

function buildUserPrompt({ log, workflow }) {
  return [
    '<triage_request>',
    `<workflow>${escapeXml(workflow)}</workflow>`,
    '<failure_log>',
    escapeXml(log),
    '</failure_log>',
    '<output_contract>',
    'Call emit_regauth_triage with the taxonomy category, confidence, direct log signals, hypothesis, slash command, recommendation, Karate sketch, and CI validation plan.',
    'Use /regauth:classify-failure, /regauth:draft-karate-scenario, /regauth:audit-isolation, or /regauth:ci-validation-plan based on workflow.',
    '</output_contract>',
    '</triage_request>',
  ].join('\n');
}

function buildAnthropicRequest({ log, workflow }) {
  return {
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 1400,
    temperature: temperatureForWorkflow(workflow),
    system: buildSystemBlocks(),
    tools: buildTools(),
    tool_choice: {
      type: 'tool',
      name: 'emit_regauth_triage',
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildUserPrompt({ log, workflow }),
          },
        ],
      },
    ],
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function parseTriageResult(message) {
  const toolUse = message.content?.find((block) => block.type === 'tool_use');
  if (!toolUse?.input) {
    throw new Error('Claude did not return the expected triage tool call.');
  }

  const result = toolUse.input;
  if (!CATEGORIES.includes(result.category)) {
    throw new Error('Claude returned an unknown taxonomy category.');
  }

  return {
    category: result.category,
    confidence: clampInteger(result.confidence, 0, 100),
    signals: sanitizeStringArray(result.signals, ['needs more evidence']),
    hypothesis: sanitizeString(result.hypothesis),
    slashCommand: sanitizeString(result.slashCommand),
    recommendation: sanitizeString(result.recommendation),
    karateSketch: sanitizeString(result.karateSketch),
    validationPlan: sanitizeStringArray(result.validationPlan, [
      'Reproduce the failure from a clean checkout.',
      'Validate setup ownership and test data isolation.',
      'Run the standard regression CI gate before adoption.',
    ]),
  };
}

function sanitizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'No evidence provided.';
}

function sanitizeStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const sanitized = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return sanitized.length ? sanitized : fallback;
}

function clampInteger(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.AGENT_CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
}

async function handleAgentRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/agent') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    sendJson(response, 503, { error: 'ANTHROPIC_API_KEY is not configured.' });
    return;
  }

  const body = await readJsonBody(request);
  const log = typeof body.log === 'string' ? body.log.trim() : '';
  const workflow = WORKFLOWS.has(body.workflow) ? body.workflow : 'classify';

  if (!log) {
    sendJson(response, 400, { error: 'A failure log is required.' });
    return;
  }

  const anthropicRequest = buildAnthropicRequest({ log, workflow });
  const headers = {
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
  };

  if (process.env.ANTHROPIC_BETA) {
    headers['anthropic-beta'] = process.env.ANTHROPIC_BETA;
  }

  const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(anthropicRequest),
  });

  const message = await anthropicResponse.json();
  if (!anthropicResponse.ok) {
    sendJson(response, anthropicResponse.status, {
      error: message.error?.message || 'Anthropic request failed.',
    });
    return;
  }

  const result = parseTriageResult(message);
  const usage = message.usage || {};
  const cacheCreationInputTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadInputTokens = usage.cache_read_input_tokens || 0;

  sendJson(response, 200, {
    result,
    model: message.model || anthropicRequest.model,
    usage: {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    },
    cache: {
      creationInputTokens: cacheCreationInputTokens,
      readInputTokens: cacheReadInputTokens,
    },
    caveats: [
      'Messages API calls are stateless; the server sends the full task context each request.',
      'Assistant prefill is intentionally not used because newer models may not support it; structured tool output is preferred.',
    ],
  });
}

createServer((request, response) => {
  handleAgentRequest(request, response).catch((error) => {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
  });
}).listen(PORT, () => {
  console.log(`RegAuth agent API listening on http://localhost:${PORT}/api/agent`);
});
