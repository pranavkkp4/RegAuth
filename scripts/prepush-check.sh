#!/usr/bin/env bash
set -euo pipefail

echo "Running local safety checks before push..."

REPO_ROOT="${REG_AUTH_REPO_ROOT:-$(pwd)}"

if command -v cygpath >/dev/null 2>&1; then
  REPO_ROOT="$(cygpath -m "$REPO_ROOT")"
fi

git_safe() {
  git -c safe.directory="$REPO_ROOT" "$@"
}

CURRENT_BRANCH="$(git_safe rev-parse --abbrev-ref HEAD)"

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  echo "Refusing to push directly from $CURRENT_BRANCH."
  echo "Create a feature branch first."
  exit 1
fi

echo "Fetching latest origin/main..."
git_safe fetch origin main

echo "Checking whether branch is behind origin/main..."
BEHIND_COUNT="$(git_safe rev-list --count HEAD..origin/main)"

if [[ "$BEHIND_COUNT" -gt 0 ]]; then
  echo "Warning: your branch is behind origin/main by $BEHIND_COUNT commit(s)."
  echo "Pull or rebase before pushing to reduce merge conflict risk."
fi

echo "Running npm checks..."
npm run lint
npm run build

if npm run | grep -q " test"; then
  npm test
else
  echo "No npm test script found. Skipping tests."
fi

echo "Checking for possible merge conflicts with origin/main..."

git_safe merge-tree "$(git_safe merge-base HEAD origin/main)" HEAD origin/main > /tmp/merge-check.txt

if grep -q "<<<<<<<" /tmp/merge-check.txt; then
  echo "Potential merge conflict detected with origin/main."
  echo "Resolve conflicts locally before pushing."
  exit 1
fi

echo "Safety checks passed. Push is likely safe."
echo "This script does not push automatically. Run git push manually when ready."
