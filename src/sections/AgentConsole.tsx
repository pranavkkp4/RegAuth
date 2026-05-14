import { useMemo, useState } from 'react';
import { Clipboard, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  agentSampleFailures,
  agentWorkflowOptions,
  type AgentWorkflowId,
} from '../content/siteContent';
import type { LiveAgentResponse } from '../lib/agentApi';
import { requestLiveAgentTriage } from '../lib/agentApi';
import { triageFailureLog } from '../lib/agentTriage';

const defaultWorkflow: AgentWorkflowId = 'classify';
type AgentMode = 'local' | 'live' | 'fallback';

export default function AgentConsole() {
  const [logInput, setLogInput] = useState(agentSampleFailures[0].log);
  const [workflow, setWorkflow] = useState<AgentWorkflowId>(defaultWorkflow);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('local');
  const [liveResponse, setLiveResponse] = useState<LiveAgentResponse | null>(null);
  const [lastRun, setLastRun] = useState({
    log: agentSampleFailures[0].log,
    workflow: defaultWorkflow,
  });

  const localResult = useMemo(
    () => triageFailureLog(lastRun.log, lastRun.workflow),
    [lastRun]
  );
  const result = liveResponse?.result ?? localResult;

  const runAgent = async () => {
    const nextRun = {
      log: logInput,
      workflow,
    };
    setLastRun(nextRun);
    setCopied(false);
    setIsRunning(true);
    setLiveResponse(null);

    const response = await requestLiveAgentTriage(nextRun);
    if (response) {
      setLiveResponse(response);
      setAgentMode('live');
    } else {
      setAgentMode('fallback');
    }

    setIsRunning(false);
  };

  const copyCommand = async () => {
    await navigator.clipboard.writeText(result.slashCommand);
    setCopied(true);
  };

  return (
    <div className="mt-12 rounded-lg border border-[#DDE3EE] bg-white shadow-[0_24px_70px_rgba(11,20,90,0.08)]">
      <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-[#DDE3EE] p-5 md:p-6 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#667085]">
                Agent Console
              </span>
              <h3 className="mt-2 font-display text-3xl leading-tight text-[#1A1F71]">
                Triage a Forward Auth failure
              </h3>
            </div>
            <Sparkles className="mt-1 h-6 w-6 text-[#F7B600]" />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {agentWorkflowOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setWorkflow(option.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  workflow === option.id
                    ? 'border-[#F7B600] bg-[#FFF9E8]'
                    : 'border-[#DDE3EE] bg-white hover:border-[#B8C2D6]'
                }`}
              >
                <span className="block text-sm font-semibold text-[#0B145A]">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[#667085]">
                  {option.body}
                </span>
              </button>
            ))}
          </div>

          <Textarea
            value={logInput}
            onChange={(event) => setLogInput(event.target.value)}
            className="min-h-[250px] resize-y border-[#C9D3E5] bg-[#F8FAFC] font-mono text-sm leading-relaxed text-[#1D2939]"
            aria-label="Forward Auth failure log"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {agentSampleFailures.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setLogInput(sample.log)}
                  className="rounded-md border border-[#DDE3EE] px-3 py-2 text-xs font-medium text-[#475467] transition-colors hover:border-[#F7B600] hover:text-[#1A1F71]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              onClick={runAgent}
              disabled={isRunning}
              className="bg-[#1A1F71] text-white hover:bg-[#0B145A]"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running' : 'Run Agent'}
            </Button>
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-5 md:p-6">
          <div className="mb-4 rounded-lg border border-[#DDE3EE] bg-white px-4 py-3 text-sm text-[#475467]">
            <span className="font-semibold text-[#0B145A]">
              {agentMode === 'live'
                ? 'Live Anthropic triage'
                : agentMode === 'fallback'
                  ? 'Local fallback triage'
                  : 'Local deterministic triage'}
            </span>
            {liveResponse ? (
              <span className="ml-2">
                {liveResponse.model} · input {liveResponse.usage.inputTokens} · output{' '}
                {liveResponse.usage.outputTokens} · cache read{' '}
                {liveResponse.cache.readInputTokens}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[#DDE3EE] bg-white p-4">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#667085]">
                Taxonomy
              </span>
              <p className="mt-2 text-base font-semibold text-[#0B145A]">
                {result.category}
              </p>
            </div>
            <div className="rounded-lg border border-[#DDE3EE] bg-white p-4">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#667085]">
                Confidence
              </span>
              <p className="mt-2 text-base font-semibold text-[#0B145A]">
                {result.confidence}%
              </p>
            </div>
            <div className="rounded-lg border border-[#DDE3EE] bg-white p-4">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#667085]">
                Signals
              </span>
              <p className="mt-2 text-base font-semibold text-[#0B145A]">
                {result.signals.slice(0, 2).join(', ')}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-lg border border-[#DDE3EE] bg-white p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#667085]">
                Root-Cause Hypothesis
              </h4>
              <p className="mt-3 text-base font-light leading-relaxed text-[#344054]">
                {result.hypothesis}
              </p>
            </section>

            <section className="rounded-lg border border-[#DDE3EE] bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#667085]">
                    Claude Code Command
                  </h4>
                  <code className="mt-3 block rounded-md bg-[#0B145A] px-3 py-3 font-mono text-sm text-white">
                    {result.slashCommand}
                  </code>
                </div>
                <Button type="button" variant="outline" onClick={copyCommand}>
                  <Clipboard className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </section>

            <section className="rounded-lg border border-[#DDE3EE] bg-white p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#667085]">
                Recommendation
              </h4>
              <p className="mt-3 text-base font-light leading-relaxed text-[#344054]">
                {result.recommendation}
              </p>
            </section>

            <section className="rounded-lg border border-[#DDE3EE] bg-white p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#667085]">
                Karate Sketch
              </h4>
              <pre className="mt-3 max-h-[260px] overflow-auto rounded-md bg-[#0B145A] p-4 text-sm leading-relaxed text-white">
                <code>{result.karateSketch}</code>
              </pre>
            </section>

            <section className="rounded-lg border border-[#DDE3EE] bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-[#F7B600]" />
                <h4 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#667085]">
                  CI Validation
                </h4>
              </div>
              <ul className="space-y-2">
                {result.validationPlan.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-[#475467]">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
