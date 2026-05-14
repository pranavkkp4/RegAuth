import type { AgentWorkflowId } from '../content/siteContent';
import type { AgentTriageResult } from './agentTriage';

export type AgentUsageMetrics = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
};

export type LiveAgentResponse = {
  result: AgentTriageResult;
  provider: 'Anthropic' | 'Gemini';
  source: 'Anthropic primary' | 'Gemini fallback';
  model: string;
  usage: AgentUsageMetrics;
  cache: {
    creationInputTokens: number;
    readInputTokens: number;
  };
  caveats: string[];
  fallbackReason?: string;
};

type LiveAgentRequest = {
  log: string;
  workflow: AgentWorkflowId;
};

const agentApiUrl = import.meta.env.VITE_AGENT_API_URL as string | undefined;

export async function requestLiveAgentTriage(
  request: LiveAgentRequest,
  signal?: AbortSignal
): Promise<LiveAgentResponse | null> {
  if (!agentApiUrl) {
    return null;
  }

  try {
    const response = await fetch(agentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as LiveAgentResponse;
  } catch {
    return null;
  }
}
