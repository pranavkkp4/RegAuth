# Code Review Workflow

This repository is set up for a production-grade regression workflow: engineers work on branches, run local safety checks, open pull requests, and rely on GitHub Actions for CI validation before merge.

## One-Time Setup

Install the local pre-push hook for this clone:

```bash
npm run hooks:install
```

The hook runs `npm run prepush:check` every time this repository pushes a branch.

## Daily Review Flow

1. Create a feature branch from `main`.
2. Make focused changes.
3. Run `npm run prepush:check`.
4. Push the branch to GitHub.
5. Open a pull request into `main`.
6. Use the pull request template to tell reviewers what changed, what risk exists, and which checks ran.
7. Merge only after CI passes and review feedback is resolved.

## Real Push Test

Use this repository to test the workflow end to end:

```bash
git switch -c review/test-github-safety
npm run prepush:check
git push -u origin review/test-github-safety
```

The branch should be pushed only after the local gate passes. GitHub Actions should then run on the pull request.

## Reviewer Checklist

- Confirm the change is scoped and easy to reason about.
- Confirm AI-assisted edits are engineer-reviewed.
- Confirm `npm run lint`, `npm run build`, and available tests pass.
- Confirm no secrets, `.env` files, logs, or generated artifacts are committed.
- Confirm the branch is not stale against `origin/main`.
- Confirm merge conflicts are handled before merge.
- Confirm Forward Auth changes preserve deterministic execution and test isolation.

## Branch Protection Recommendation

In GitHub repository settings, protect `main` with:

- Require pull request before merging.
- Require approvals before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Include the `CI / build-and-check` status check once it has run at least once.
- Restrict direct pushes to `main`.

These settings are configured in GitHub, not in repository files, so they should be enabled by a repository admin.
