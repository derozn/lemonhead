---
name: review
description: Pre-PR review pass using the read-only reviewer agent. Use at the end of /task or standalone before any PR. Every finding gets fixed or explicitly declined with a recorded reason.
---

# /review — findings in, decisions out

1. **Scope the diff**: `git diff main...HEAD` (plus working tree if uncommitted). If the branch is docs-only, a prose read suffices; say so.
2. **Launch the reviewer agent** on that scope. It is read-only by construction (Read/Grep/Glob only) and returns findings in its fixed format, most severe first.
3. **Triage every finding**, no skipping:
   - Fix now: blocking findings and cheap should-fixes.
   - Decline with reason: write the reason down; declined findings and their reasons go in the PR body (the same discipline /simplify used: "deliberately skipped X because Y").
   - Never argue a finding away silently.
4. **Re-run validate** if anything changed.
5. If the reviewer reports clean, record that in the PR body and move on; do not fish for more.

Deeper passes when warranted: `/simplify` for a quality sweep of a large diff; `/code-review` for a bug hunt; `/security-review` before anything touching secrets, auth, or user data handling.
