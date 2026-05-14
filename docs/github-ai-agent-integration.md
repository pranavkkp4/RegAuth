# GitHub AI Agent Integration

This guide describes the Forward Auth regression automation layer that runs Karate in GitHub Actions, analyzes failures with an AI agent, posts a pull request comment, and optionally learns from reviewed feedback.

## Repository Secrets And Variables

Add these in GitHub under **Settings > Secrets and variables > Actions**.

Required for live Anthropic analysis:

- Secret `ANTHROPIC_API_KEY`: server-side key used only inside GitHub Actions or local shells.

Optional provider/model settings:

- Variable `ANTHROPIC_MODEL`: defaults to `claude-sonnet-4-20250514`.
- Secret `GEMINI_API_KEY`: enables Gemini fallback when Anthropic is unavailable.
- Variable `GEMINI_MODEL`: defaults to `gemini-1.5-flash`.

Do not put real values in `.env.example`, source files, PR comments, or workflow logs. The checked-in `.env.example` must stay placeholder-only.

## Workflow Behavior

The workflow lives at `.github/workflows/karate-ai-agent.yml` and runs on pull requests targeting `main`.

It performs these steps:

1. Checks out the repository.
2. Sets up Java 17 and Python 3.11.
3. Installs Python dependencies from `requirements.txt`.
4. Creates `target/karate-reports`.
5. If `pom.xml` is missing, writes a skip log and exits the Maven step successfully.
6. If `pom.xml` exists, runs the configured Karate test runner with Maven.
7. If Karate fails, runs `scripts/agent_runner.py`.
8. Writes `target/karate-ai-agent-summary.md`.
9. Creates or updates one PR comment marked with `<!-- regauth-ai-agent -->`.
10. Uploads Karate logs, the generated summary, and any feedback artifact that exists.
11. Fails the job after the comment is posted when Karate failed.

The workflow intentionally continues after a test failure so reviewers get diagnosis output before the job turns red.

## Provider Routing

`scripts/agent_runner.py` uses this route order:

1. Anthropic primary when `ANTHROPIC_API_KEY` is set.
2. Gemini fallback when `GEMINI_API_KEY` is set and Anthropic is unavailable or fails.
3. Local deterministic fallback when no provider route succeeds.

The runner uses XML-tagged prompt context and temperature `0` for root-cause analysis. It never requires provider keys to produce a PR-safe markdown comment.

The walkthrough CLI uses the same conceptual cascade for demos:

```bash
python scripts/walkthrough_cli.py
python scripts/walkthrough_cli.py --fast
```

## PR Comments

The generated markdown starts with this marker:

```markdown
<!-- regauth-ai-agent -->
```

The GitHub Actions script searches existing PR comments by that marker and updates the previous bot comment. If no comment exists, it creates one. This keeps each PR to a single living diagnosis instead of adding a new comment on every push.

The comment includes:

- Agent mode and model.
- Report directory.
- Likely category and confidence.
- Evidence signals.
- Retrieved feedback snippets.
- Hypothesis and suggested fix.
- Karate sketch.
- Validation plan.
- Analyzed artifacts.
- Token usage when Anthropic returns it.

## RAG Feedback Loop

The runner accepts a markdown knowledge file:

```bash
python scripts/agent_runner.py \
  --log-dir target/karate-reports \
  --output target/karate-ai-agent-summary.md \
  --feedback-file knowledge/regauth-feedback.md
```

Feedback retrieval is read-only by default. If the file exists, the runner splits it by markdown headings, scores snippets against failure text and taxonomy keywords, and injects the best matches into:

```xml
<retrieved_feedback>
  ...
</retrieved_feedback>
```

To append a compact reviewed record, opt in explicitly:

```bash
python scripts/agent_runner.py \
  --log-dir target/karate-reports \
  --output target/karate-ai-agent-summary.md \
  --feedback-file knowledge/regauth-feedback.md \
  --save-feedback
```

Use `--save-feedback` only after a human has reviewed the diagnosis. CI does not pass `--save-feedback`, so normal pull request runs do not mutate repository files.

## Local Setup

Install Python dependencies:

```bash
python -m pip install -r requirements.txt
```

Run the agent without live model keys:

```bash
python scripts/agent_runner.py \
  --log-dir target/karate-reports \
  --output target/karate-ai-agent-summary.md
```

Run with Anthropic:

```bash
set ANTHROPIC_API_KEY=your_key
set ANTHROPIC_MODEL=claude-sonnet-4-20250514
python scripts/agent_runner.py --log-dir target/karate-reports
```

Run with Gemini fallback:

```bash
set GEMINI_API_KEY=your_key
set GEMINI_MODEL=gemini-1.5-flash
python scripts/agent_runner.py --log-dir target/karate-reports
```

On macOS or Linux, use `export` instead of `set`.

## Local App

The browser app still calls the local Node API instead of reading provider keys directly:

```bash
npm run dev
npm run agent:server
```

Keep `.env` local and uncommitted. Use `.env.example` only as a placeholder template.
