# GitHub Safety Workflow

This project uses a branch-first workflow for engineer-in-the-loop AI changes. Claude Code can propose local edits, Karate test templates, and debugging paths, but it never pushes automatically, never auto-resolves conflicts, and never replaces engineer review.

## Workflow

1. Create a feature branch from `main`.
2. Let Claude Code propose scoped local changes for the Forward Auth regression suite or site.
3. Run `npm run prepush:check` before pushing.
4. Open a pull request after local safety checks pass.
5. Let GitHub Actions run CI validation on the pull request.
6. Merge only after review, passing checks, and branch protection requirements are satisfied.

Install the repository-local pre-push hook with:

```bash
npm run hooks:install
```

After installation, real `git push` attempts from this clone run the local safety gate automatically.

## Local Pre-Push Gate

The script at `scripts/prepush-check.sh` is designed to reduce avoidable integration risk before a branch reaches GitHub.

It checks:

- The current branch is not `main` or `master`.
- `origin/main` has been fetched.
- The current branch is not silently drifting behind `origin/main`.
- `npm run lint` passes.
- `npm run build` passes.
- `npm test` runs when a test script is available.
- A non-destructive `git merge-tree` check does not detect conflict markers against `origin/main`.

The script prints warnings for behind-main drift and blocks when build, lint, tests, or merge conflict checks fail. It does not push, commit, stash, rebase, merge, or resolve conflicts.

On Windows, `npm run prepush:check` uses `scripts/run-prepush-check.mjs` to find Git Bash automatically. The raw Bash command is still available as `npm run prepush:check:bash`.

## CI Validation

The workflow at `.github/workflows/ci.yml` repeats the core validation path on pull requests and pushes to `main`:

- Install dependencies with `npm ci`.
- Run lint.
- Build the project.
- Run tests when a test script exists.

This makes local validation and GitHub CI consistent, which is important for production-grade regression workflow and branch protection.

## Pull Request Review

The pull request template at `.github/pull_request_template.md` gives contributors and reviewers a repeatable checklist for:

- review scope
- local validation
- CI validation
- secret and artifact safety
- branch freshness
- merge conflict prevention
- test isolation impact

For a contributor-facing guide, see `docs/code-review-workflow.md`.

## Safety Expectations

- Keep generated build artifacts out of commits.
- Keep `.env`, `.env.*`, logs, and local files ignored.
- Review AI-authored changes as code from a teammate: check scope, evidence, failure classification, and test isolation impact.
- Prefer root-cause reduction over retry-based masking for Forward Auth flaky failures.
- Document merge conflict risk early so reviewers are not surprised by stale branches.
