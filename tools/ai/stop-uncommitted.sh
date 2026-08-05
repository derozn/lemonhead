#!/usr/bin/env bash
# Stop hook: non-blocking reminder when the session ends with uncommitted
# tracked changes. Warns; never blocks.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

dirty=$(git status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')
if [ "$dirty" -gt 0 ]; then
  printf '{"systemMessage": "lemonhead: %s tracked file(s) modified but uncommitted."}\n' "$dirty"
fi
exit 0
