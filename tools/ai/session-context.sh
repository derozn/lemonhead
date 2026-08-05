#!/usr/bin/env bash
# SessionStart hook: orient the session in one screen. Deterministic, no LLM.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

branch=$(git branch --show-current 2>/dev/null || echo "detached")
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
last_log=$(grep -m 1 '^## ' docs/build-log.md 2>/dev/null | sed 's/^## //' || echo "none")
tasks_doc=$(ls docs/design/*-tasks.md 2>/dev/null | tail -1 || true)

echo "lemonhead: branch=${branch} dirty_files=${dirty}"
echo "last build-log entry: ${last_log}"
if [ -n "${tasks_doc}" ]; then
  echo "active tasks doc: ${tasks_doc}"
fi
echo "framework: /task /plan-gate /verify-rule /troubleshoot /review — docs/ai/routing.md routes tools+skills"
