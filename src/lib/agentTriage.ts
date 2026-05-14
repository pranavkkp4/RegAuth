import type { AgentWorkflowId } from '../content/siteContent';

export type FailureCategory =
  | 'Data fixture drift'
  | 'Environment readiness'
  | 'Assertion contract drift'
  | 'Framework lifecycle fault'
  | 'Product regression candidate'
  | 'Unclassified failure';

type FailureRule = {
  category: FailureCategory;
  keywords: string[];
  rootCause: string;
  action: string;
};

export type AgentTriageResult = {
  category: FailureCategory;
  confidence: number;
  signals: string[];
  hypothesis: string;
  slashCommand: string;
  recommendation: string;
  karateSketch: string;
  validationPlan: string[];
};

const failureRules: FailureRule[] = [
  {
    category: 'Data fixture drift',
    keywords: ['card pool', 'fixture', 'account state', 'token', 'test data', 'pan', 'expired'],
    rootCause:
      'The scenario appears to depend on mutable or pre-seeded payment data that is not owned by the test.',
    action:
      'Move setup into the scenario, reserve data explicitly, and add teardown or quarantine for exhausted fixtures.',
  },
  {
    category: 'Environment readiness',
    keywords: ['timeout', '503', 'connection refused', 'health check', 'unavailable', 'latency'],
    rootCause:
      'The failure points to service readiness or infrastructure instability rather than a deterministic assertion.',
    action:
      'Gate execution on health checks, capture dependency status, and keep product assertions separate from readiness checks.',
  },
  {
    category: 'Assertion contract drift',
    keywords: ['expected', 'actual', 'assert', 'match failed', 'schema', 'status code'],
    rootCause:
      'The response contract or assertion boundary changed and needs evidence before being treated as a product defect.',
    action:
      'Compare the expected contract with current payloads, narrow assertions to owned behavior, and document any spec change.',
  },
  {
    category: 'Framework lifecycle fault',
    keywords: ['karate', 'java.lang', 'nullpointer', 'beforefeature', 'callonce', 'hook'],
    rootCause:
      'The automation layer is likely failing in setup, shared utilities, or Karate lifecycle code before the product path is proven.',
    action:
      'Instrument lifecycle hooks, isolate Java utility behavior, and add a minimal repro feature for the framework path.',
  },
  {
    category: 'Product regression candidate',
    keywords: ['authorization declined', 'approved expected', 'iso8583', 'iso 8583', 'auth response', 'response code'],
    rootCause:
      'The failure could reflect a real Forward Auth behavior change and should go through engineer review with CI evidence.',
    action:
      'Preserve the failing payload, compare against prior known-good runs, and require CI validation before merge or defect routing.',
  },
];

const workflowRecommendations: Record<AgentWorkflowId, string> = {
  classify:
    'Classify the failure first, attach high-signal evidence, then decide whether the next step is refactor, environment retry, or product investigation.',
  author:
    'Draft a Karate change that owns its setup data, keeps assertions focused, and includes comments only where the domain setup is not obvious.',
  isolate:
    'Audit the scenario for hidden ordering, shared mutable state, data pool reuse, and cleanup that can collide under parallel CI execution.',
  validate:
    'Run the proposed change against the historical failure case, a clean isolated execution, and the standard regression CI gate.',
};

const workflowCommands: Record<AgentWorkflowId, string> = {
  classify: '/regauth:classify-failure',
  author: '/regauth:draft-karate-scenario',
  isolate: '/regauth:audit-isolation',
  validate: '/regauth:ci-validation-plan',
};

function findSignals(log: string, keywords: string[]) {
  return keywords.filter((keyword) => log.includes(keyword));
}

export function triageFailureLog(logInput: string, workflow: AgentWorkflowId): AgentTriageResult {
  const normalizedLog = logInput.trim().toLowerCase();
  const scoredRules = failureRules
    .map((rule) => ({
      rule,
      signals: findSignals(normalizedLog, rule.keywords),
    }))
    .sort((a, b) => b.signals.length - a.signals.length);

  const bestMatch = scoredRules[0];
  const matchedRule =
    bestMatch && bestMatch.signals.length > 0
      ? bestMatch
      : {
          rule: {
            category: 'Unclassified failure' as const,
            keywords: [],
            rootCause:
              'The log does not contain enough recognizable failure evidence to assign a reliable taxonomy class.',
            action:
              'Capture status code, payload diff, dependency health, setup path, and the first failing Karate assertion.',
          },
          signals: ['needs more evidence'],
        };

  const confidence =
    matchedRule.rule.category === 'Unclassified failure'
      ? 38
      : Math.min(92, 54 + matchedRule.signals.length * 12);

  const command = `${workflowCommands[workflow]} --taxonomy "${matchedRule.rule.category}" --evidence "${matchedRule.signals[0]}"`;

  return {
    category: matchedRule.rule.category,
    confidence,
    signals: matchedRule.signals,
    hypothesis: matchedRule.rule.rootCause,
    slashCommand: command,
    recommendation: `${workflowRecommendations[workflow]} ${matchedRule.rule.action}`,
    karateSketch: [
      'Feature: Forward Auth regression evidence path',
      '',
      '  Background:',
      '    * def testCard = call read("classpath:fixtures/reserve-card.feature")',
      '    * def requestPayload = read("classpath:payloads/forward-auth.json")',
      '',
      '  Scenario: isolated authorization behavior',
      '    Given url authBaseUrl',
      '    And path "/forward-auth"',
      '    And request requestPayload',
      '    When method post',
      '    Then status 200',
      '    And match response.audit.correlationId == "#present"',
    ].join('\n'),
    validationPlan: [
      'Reproduce the failure from a clean checkout with one scenario selected.',
      'Confirm setup owns account, card, token, and transaction prerequisites.',
      'Run the generated change against the historical failure log.',
      'Require engineer review plus standard CI validation before adoption.',
    ],
  };
}
