#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || -z "${*// }" ]]; then
  echo "Usage: ./scripts/sync.sh \"commit message\""
  exit 1
fi

message="$*"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

cd "$repo_root"

git_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ "$git_root" != "$repo_root" ]]; then
  echo "Error: this script must live inside the GameAI git repository."
  exit 1
fi

git config http.version HTTP/1.1

if [[ -z "$(git status --short)" ]]; then
  echo "No changes to sync."
  exit 0
fi

echo "Checking remote main..."
git fetch --quiet origin main
if ! git merge-base --is-ancestor origin/main HEAD; then
  echo "Error: origin/main has commits that are not in this local branch."
  echo "Run: git pull --ff-only origin main"
  exit 1
fi

echo "Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

echo "Staged summary:"
git diff --cached --stat

git commit -m "$message"
git push origin HEAD:main
