---
name: task
description: Session controller for one Lemonhead task-PR loop. Use when starting a numbered task from the active phase's task doc, or any task-shaped piece of work. Runs the full loop - branch, plan gate, delegated implementation, validate, review, build-log, PR, CI watch.
---

# /task — one task, one PR, the whole loop

Run one task from start to green CI. One task per PR (CLAUDE.md); do not batch.

## Flow

1. **Read the task.** Find it in the active phase's task doc (`docs/design/*-tasks.md`); restate its done-when. If the argument names no task, ask which one rather than guessing.
2. **Branch** off up-to-date `main`: `feat/<scope>-<slug>` (or `chore/`/`docs/` as fits). Conventional-commit scopes are enforced by commitlint.
3. **Plan gate.** Run `/plan-gate` for the task. Below 0.90, stop and resolve the gaps before writing code; between 0.70 and 0.89, present the gaps to the owner and wait.
4. **Delegate implementation** by touched paths: `packages/*` → the engine-dev agent's rules apply; `apps/web` → web-dev's. Route to external skills per `docs/ai/routing.md` (Vercel skills for Next work, claude-api for Anthropic API work, context7 for library questions). Tests land with code.
5. **Validate**: `pnpm validate` green locally. Failures are worked with `/troubleshoot`, never bypassed.
6. **Review**: run `/review`. Fix or explicitly decline each finding; declined findings go in the PR body with reasons.
7. **Build-log entry** in the same branch (the PR-guard hook blocks `gh pr create` without it). ADR if the diff contains a decision an interviewer would ask "why" about (`docs/standards.md` policy).
8. **PR**: `gh pr create` with a body covering what/why/verification; then watch CI to a terminal state (poll `gh pr checks`; ~30 min timeout). Red CI → `/troubleshoot`, push the fix, re-watch.

## Boundaries

- No scope creep: work not in the task's done-when becomes a note for the owner, not extra diff.
- Never weaken gates to pass them (coverage thresholds, lint rules, hooks).
- Anything touching government figures routes through `/verify-rule` first.
- Refactor urges mid-task: sketch one function, ask, then proceed (owner's standing rule).
