# RegAuth App

React + TypeScript + Vite site for the Forward Auth regression architecture and Claude Code/Karate triage workflow.

## Local Development

Install dependencies, then run the Vite app:

```bash
npm install
npm run dev
```

## Live Agent API

The browser never reads provider API keys. Live model calls go through a small local Node API at `server/agent-server.mjs`.

1. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or both.
2. Keep `VITE_AGENT_API_URL=http://localhost:3001/api/agent` for local development.
3. Start Vite in one terminal and the API server in another:

```bash
npm run dev
npm run agent:server
```

The live route uses Anthropic first. If Anthropic is missing or fails, the Node API tries Gemini. If no provider route succeeds or the endpoint is unavailable, `AgentConsole` falls back in the browser to the deterministic local triage rules in `src/lib/agentTriage.ts`. The console label shows the actual source, such as `Anthropic primary`, `Gemini fallback`, or `Browser local fallback triage`.

## Anthropic Request Strategy

The backend uses the Messages API as a stateless call, sending the current failure log and workflow each run. Static system and taxonomy reference blocks are XML-tagged and marked with ephemeral prompt caching. The response is shaped through native Anthropic tool use with a constrained JSON schema, then returned with input/output token counts plus `cache_creation_input_tokens` and `cache_read_input_tokens`.

Assistant prefill is intentionally not used because support varies on newer models. Structured tool output is the default path. Temperature is `0` for classification, isolation, and validation, with a small increase for Karate authoring.

## Gemini Fallback Strategy

When `GEMINI_API_KEY` is available and Anthropic is unavailable or fails, the same Node API calls Gemini server-side through the REST `generateContent` endpoint. Gemini is prompted to return strict JSON matching the RegAuth triage contract. No Gemini key or Anthropic key is exposed through Vite or browser code.

## Validation

```bash
npm run lint
npm run build
```

## GitHub Actions Karate AI Agent

The workflow at `.github/workflows/karate-ai-agent.yml` runs on pull requests targeting `main`.

Full setup and operating notes are in [`docs/github-ai-agent-integration.md`](docs/github-ai-agent-integration.md).

Repository setup:

1. Add `ANTHROPIC_API_KEY` as a GitHub repository secret for primary analysis.
2. Optionally add `ANTHROPIC_MODEL` as a repository variable. The default is `claude-sonnet-4-20250514`.
3. Optionally add `GEMINI_API_KEY` as a repository secret and `GEMINI_MODEL` as a variable for fallback analysis.
4. Keep `.env` local only. `.env.example` contains placeholders and should never contain real keys.

Workflow behavior:

- Sets up Java 17 and Python 3.11.
- Installs Python dependencies from `requirements.txt`.
- Runs `mvn -B test -Dtest=ForwardAuthRunner -Dkarate.options="--tags ~@ignore"` when `pom.xml` exists.
- Skips Maven gracefully when this Vite-only repo has no `pom.xml`.
- Continues after Karate failure so logs can be analyzed.
- Runs `scripts/agent_runner.py` only when Karate fails, using Anthropic primary, Gemini fallback, and local deterministic failsafe routing.
- Retrieves matching feedback snippets from `knowledge/regauth-feedback.md` when the file exists.
- Posts or updates the generated markdown root-cause summary as a PR comment.
- Uploads Karate reports and agent output as workflow artifacts.
- Fails the job at the end when Karate failed, after the agent has commented.

You can run the agent locally against any report directory:

```bash
python scripts/agent_runner.py --log-dir target/karate-reports --output target/karate-ai-agent-summary.md
```

`scripts/agent_runner.py` and `scripts/walkthrough_cli.py` load `app/.env` automatically when present, without overriding CI or shell-provided environment variables. That lets local `GEMINI_API_KEY` fallback work for demos and CLI runs while GitHub Actions continues to use repository secrets and variables.

To include feedback retrieval locally:

```bash
python scripts/agent_runner.py \
  --log-dir target/karate-reports \
  --output target/karate-ai-agent-summary.md \
  --feedback-file knowledge/regauth-feedback.md
```

To append a compact reviewed feedback record, opt in explicitly:

```bash
python scripts/agent_runner.py \
  --log-dir target/karate-reports \
  --output target/karate-ai-agent-summary.md \
  --feedback-file knowledge/regauth-feedback.md \
  --save-feedback
```

If `ANTHROPIC_API_KEY` is available in the environment, the runner calls Anthropic's Messages API server-side with XML prompt tags, cached system/reference blocks, constrained native tool schemas, and temperature `0`. If Anthropic is unavailable and `GEMINI_API_KEY` is set, it tries Gemini. If provider calls are unavailable, it writes a deterministic local analysis instead of failing the CI comment path.

## Terminal Walkthrough CLI

Install the optional presentation dependency, then run the interactive walkthrough:

```bash
python -m pip install -r requirements.txt
python scripts/walkthrough_cli.py
```

For quick rehearsal or CI smoke checks:

```bash
python scripts/walkthrough_cli.py --fast
```

The walkthrough demonstrates Forward Auth log capture, XML evidence preservation, Anthropic primary routing, Gemini fallback routing, simulation failsafe behavior, and a suggested Karate fix. If Rich is not installed, it falls back to a plain ANSI terminal presentation.
