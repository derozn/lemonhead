# Backlog: deferred decisions and open threads

The single register of everything consciously parked, deferred, or pending. Written 2026-08-06 as the handoff for the full project revisit; updated the same day with the revisit's owner verdicts (full record: `docs/revisit-2026-08.md`). Each item: what, why it waits, and the trigger that reopens it. Sources: build log, PR bodies, phase-1-review, ADRs, and session decisions.

## Do now — Phase 1.5 hardening batch (owner verdicts, 2026-08-06)

| Item                                              | What                                                                                                                                                                                                                                                 | Origin                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Vercel project link + `PREVIEW_PASSWORD`          | Owner step; middleware and build ready since Phase 1. Unblocks preview sharing and remote cache.                                                                                                                                                     | Owner-only item, promoted     |
| Money-boundary fix (ADR 0008) + UC-guard widening | Explanation lines carry raw Pence fields, `apps/web` formats via `pounds()`; type-aware ESLint rule bans Pence arithmetic outside `money.ts`; string tests; UC memory-only enforcement widened beyond `storage.ts`.                                  | Revisit audit findings 1–3    |
| Schemas coverage threshold                        | Cover `fee-schedule.ts:229`, add a coverage threshold for `packages/schemas`.                                                                                                                                                                        | Trade-off row, promoted       |
| `next-env.d.ts` tracked-input mutation            | Fix the first-checkout `next build` cache miss at source.                                                                                                                                                                                            | Trade-off row, promoted       |
| `gross.ts` sketch-first pass                      | One function's before/after, owner verdict before anything wider.                                                                                                                                                                                    | Parked row, promoted          |
| Verbatim citation quotes                          | Re-fetch the `quote` fields in all three params files via /verify-rule so each is an exact gov.uk extract.                                                                                                                                           | Revisit audit finding 5       |
| Comparison view (FR4)                             | Moved forward from Phase 4 by spec amendment v1.2.                                                                                                                                                                                                   | Parked row, promoted          |
| Phase 2 design doc + task breakdown               | First work after Phase 1.5; owner approval gates implementation (spec workflow). Specifies /collect-sheet + fee-sheet-analyst (build in Phase 2) and /experiment skill + hook (build in Phase 2, ready for Phase 3), both promoted by owner verdict. | Not-yet-started rows 21, 7, 8 |

## Parked by explicit decision (triggers re-confirmed 2026-08-06)

| Item                                                        | Why it waits                                                          | Trigger                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Trademark clearance (classes 9/36/42) + domain purchase     | Spec §1.3 pre-launch gate; owner task                                 | Before any public launch under the name                                       |
| Lex MCP wiring                                              | Requires self-hosting; dead config helps nobody                       | First time /verify-rule needs statutory instrument text                       |
| Ofsted provider ingest + `fee_benchmark` + EES API (merged) | No consumer yet; 18MB CSV ingest is real work; EES API unverified     | A directory/comparison feature, or Phase 3 wanting regional fee sanity bounds |
| PROJECT_INDEX convention                                    | Repo still navigable (kept over a drop recommendation at the revisit) | When navigation cost appears (agent or human)                                 |
| shadcn adoption + CSS Modules migration                     | Current global sheet suffices for the PoC UI                          | Phase 4 UI build                                                              |
| Playwright e2e + manual screen-reader pass                  | PoC scope                                                             | Phase 4 (e2e); every new flow (screen-reader, per standards.md)               |

## Accepted trade-offs still parked

| Item                                                     | The trade                                                                             | Trigger                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| TypeScript pinned 6.0.3                                  | typescript-eslint peer range `<6.1.0`; typed lint (purity rules) worth more than TS 7 | Renovate will surface the unpin moment; verify nothing else drifted                 |
| jsx-a11y peer warning under eslint 10                    | Plugin declares ≤9; rules-spread usage works                                          | Plugin release; or swap if a maintained fork appears                                |
| Turbo without remote cache / `--affected` in CI          | Single-runner CI is fast enough today                                                 | When CI time or package count grows; Vercel link lands via the do-now batch         |
| TFC quarterly caps on calendar quarters                  | Real entitlement periods run from account opening; approximation stated on every line | If user feedback shows material error near quarter boundaries                       |
| All-year billing assumed at 51 weeks                     | Nursery-specific opening weeks not captured; assumption stated per line               | Capture per-nursery weeks in FeeSchedule when extraction lands (schema slot exists) |
| UC figures re-asked after reload                         | Memory-only privacy stance (ADR 0007) costs repeat-visit friction                     | User feedback; a consent-based "remember on this device" was the runner-up option   |
| Engine `MonthlyGross`/line types are plain TS internally | Zod validation happens at CostProjection exit                                         | Fine unless internal shapes start crossing package boundaries                       |

## Not yet started

| Item                     | Notes                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| `docs/experiment-log.md` | Deliberately starts with the first Phase 3 extraction experiment           |
| Framework dogfood report | After Phase 2 runs through /task a few times: what worked, what's ceremony |

## Dropped

Nothing. Every row survived the 2026-08-06 triage with an explicit verdict.

## Standing rules that govern the revisit itself

Sketch-first for refactors; adopt-first for tooling; scope decisions get costed options, not pre-decisions; gates are never weakened to pass; every government figure re-verifies through /verify-rule. Conflict hierarchy: spec > CLAUDE.md > standards > preference.
