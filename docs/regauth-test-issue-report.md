# RegAuth Test Issue Report

Date: 2026-05-14

Two read-only tester agents reviewed the current RegAuth app after the GitHub CI, Python agent, and live agent console work.

## Tester A: React, TypeScript, and Frontend

Scope:

- React/Vite app behavior.
- `tsconfig.app.json` diagnostics.
- `npm` lint and production build.
- Agent console source labeling and fallback behavior.

Findings:

- The live site API path was Anthropic-only. A configured `GEMINI_API_KEY` did not help the browser agent if Anthropic was missing or failed.
- The React console labeled every live result as Anthropic, even when a future fallback provider should be shown.
- The README described the local browser path as Anthropic-only while CI and CLI docs already mentioned Gemini fallback.
- TypeScript commands passed, but `tsconfig.app.json` could show editor diagnostics around `tsBuildInfoFile` without an explicit incremental setting.

Resolution:

- The server route now attempts Anthropic first, then Gemini, before the browser falls back to local deterministic triage.
- The API response includes provider/source metadata, and the console displays the actual live route.
- Documentation now describes provider routing consistently.
- TypeScript configs now make incremental build-info behavior explicit while keeping strict checking enabled.

## Tester B: Python, CI, Workflow, and Secret Hygiene

Scope:

- `scripts/agent_runner.py`.
- `scripts/walkthrough_cli.py`.
- GitHub Actions workflow behavior.
- `.env.example` and ignored secret hygiene.
- Server-side provider fallback behavior.

Findings:

- The live site API did not incorporate Gemini fallback.
- Python scripts read process environment variables only, so a local `.env` Gemini key would not be used unless exported in the terminal.
- CI secret hygiene was sound: `.env`, build output, target reports, and Python bytecode were ignored.
- No real Anthropic or Gemini keys were found in tracked files.

Resolution:

- The Node live API now supports Anthropic primary and Gemini fallback without exposing keys to browser code.
- Python scripts now load `app/.env` locally without overriding shell or CI-provided variables.
- `.env.example` remains placeholder-only.

## Validation Commands

The fixer and final review used:

```bash
node --check server/agent-server.mjs
python -B -m py_compile scripts/agent_runner.py scripts/walkthrough_cli.py
npm.cmd run lint
npm.cmd run build
npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false
```

All checks passed after the fixes.
