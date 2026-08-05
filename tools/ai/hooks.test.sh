#!/usr/bin/env bash
# Pipe-tests for every hook in .claude/settings.json. Runs in CI.
# Each hook is fed synthesized stdin exactly as Claude Code would send it,
# and we assert the exit code for both the pass and the block case.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

fails=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo "ok: $name (exit $actual)"
  else
    echo "FAIL: $name (expected $expected, got $actual)"
    fails=$((fails + 1))
  fi
}

# --- params-citation-guard ---
tmp_good=$(mktemp -d)/packages/entitlements/src/rules/test/params
mkdir -p "$tmp_good"
cat > "$tmp_good/2026-04-06.test.ts" << 'EOF'
// url: 'https://www.gov.uk/tax-free-childcare', retrievedOn: '2026-08-05'
EOF
echo "{\"tool_input\":{\"file_path\":\"$tmp_good/2026-04-06.test.ts\"}}" | bash tools/ai/params-citation-guard.sh
check "citation-guard passes cited params file" 0 $?

cat > "$tmp_good/2026-04-07.test.ts" << 'EOF'
export const uncited = { cap: 200000 };
EOF
echo "{\"tool_input\":{\"file_path\":\"$tmp_good/2026-04-07.test.ts\"}}" | bash tools/ai/params-citation-guard.sh 2>/dev/null
check "citation-guard blocks uncited params file" 2 $?

echo '{"tool_input":{"file_path":"/somewhere/else/file.ts"}}' | bash tools/ai/params-citation-guard.sh
check "citation-guard ignores non-params paths" 0 $?

# --- pr-guard (build-log) --- reproduce the settings.json command with a
# stubbed git so we test pass and block without touching real branches.
pr_guard_cmd=$(jq -r '.hooks.PreToolUse[] | select(.matcher == "Bash") | .hooks[0].command' .claude/settings.json)

fake_bin=$(mktemp -d)
cat > "$fake_bin/git" << 'EOF'
#!/usr/bin/env bash
if [ "$1" = "diff" ]; then echo "$FAKE_DIFF"; exit 0; fi
exec /usr/bin/git "$@"
EOF
chmod +x "$fake_bin/git"

# Pipe stdin into the WHOLE hook command (as Claude Code does) — piping into
# just the first segment puts the jq assignment in a subshell and voids the test.
run_pr_guard() {
  printf '%s\n' "$1" | FAKE_DIFF="$2" PATH="$fake_bin:$PATH" bash -c "$pr_guard_cmd"
}

run_pr_guard '{"tool_input":{"command":"gh pr create --title x"}}' 'docs/build-log.md
packages/entitlements/src/x.ts'
check "pr-guard passes branch with build-log change" 0 $?

run_pr_guard '{"tool_input":{"command":"gh pr create --title x"}}' 'packages/entitlements/src/x.ts' 2>/dev/null
check "pr-guard blocks branch without build-log change" 2 $?

run_pr_guard '{"tool_input":{"command":"gh pr create --title x"}}' 'docs/spec.md'
check "pr-guard exempts docs-only branches" 0 $?

run_pr_guard '{"tool_input":{"command":"ls"}}' 'irrelevant'
check "pr-guard ignores non-pr commands" 0 $?

# --- session-context + stop hooks: run without error ---
bash tools/ai/session-context.sh > /dev/null
check "session-context runs" 0 $?
bash tools/ai/stop-uncommitted.sh > /dev/null
check "stop-uncommitted runs" 0 $?

if [ "$fails" -gt 0 ]; then
  echo "$fails hook test(s) failed"
  exit 1
fi
echo "all hook tests passed"
