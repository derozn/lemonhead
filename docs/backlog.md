# Backlog: deferred decisions and open threads

The single register of everything consciously parked, deferred, or pending. Written 2026-08-06 as the handoff for the full project revisit. Each item: what, why it waits, and the trigger that reopens it. Sources: build log, PR bodies, phase-1-review, ADRs, and session decisions.

## Owner-only items

| Item                                                    | Why it waits                                                           | Trigger                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Trademark clearance (classes 9/36/42) + domain purchase | Spec §1.3 pre-launch gate; owner task                                  | Before any public launch under the name |
| Vercel project link + `PREVIEW_PASSWORD`                | Middleware and build ready since Phase 1; needs owner's Vercel account | Whenever a shareable preview is wanted  |

## Parked by explicit decision

| Item                                                               | Why it waits                                                                                               | Trigger                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `gross.ts` structural polish                                       | Full decomposition built, shown, rejected 2026-08-05 ("worse than before"); sketch-first rule now standing | Post-PoC, owner-initiated; sketch one function first                          |
| Lex MCP wiring                                                     | Requires self-hosting; dead config helps nobody                                                            | First time /verify-rule needs statutory instrument text                       |
| Ofsted provider ingest + `fee_benchmark` tools (govuk-mcp v2)      | No consumer yet; 18MB CSV ingest is real work; EES API unverified                                          | A directory/comparison feature, or Phase 3 wanting regional fee sanity bounds |
| PROJECT_INDEX convention                                           | Repo still navigable                                                                                       | When navigation cost appears (agent or human)                                 |
| /collect-sheet skill + fee-sheet-analyst agent (framework Phase B) | Belongs with real golden-set collection                                                                    | First Phase 2 collection task                                                 |
| /experiment skill + experiment-log hook (framework Phase C)        | Belongs with the extraction pipeline                                                                       | First Phase 3 task; /loop criteria already written (framework.md)             |
| shadcn adoption + CSS Modules migration                            | Current global sheet suffices for the PoC UI                                                               | Phase 4 UI build                                                              |
| Playwright e2e + manual screen-reader pass                         | PoC scope                                                                                                  | Phase 4 (e2e); every new flow (screen-reader, per standards.md)               |
| Comparison view (FR4)                                              | Spec assigns to Phase 4                                                                                    | Phase 4                                                                       |

## Accepted trade-offs to re-examine at the revisit

| Item                                                     | The trade                                                                             | Re-examine because                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| TypeScript pinned 6.0.3                                  | typescript-eslint peer range `<6.1.0`; typed lint (purity rules) worth more than TS 7 | Renovate will surface the unpin moment; verify nothing else drifted                 |
| jsx-a11y peer warning under eslint 10                    | Plugin declares ≤9; rules-spread usage works                                          | Plugin release; or swap if a maintained fork appears                                |
| Coverage gate covers `entitlements` only                 | `schemas` ~98%, `web` untargeted                                                      | Decide whether schemas deserves its own threshold                                   |
| First `next build` cache miss after checkout             | `next-env.d.ts` rewrite mutates a tracked input once                                  | Only if it starts biting in CI (remote cache would mask it)                         |
| Turbo without remote cache / `--affected` in CI          | Single-runner CI is fast enough today                                                 | When CI time or package count grows; needs Vercel link                              |
| TFC quarterly caps on calendar quarters                  | Real entitlement periods run from account opening; approximation stated on every line | If user feedback shows material error near quarter boundaries                       |
| All-year billing assumed at 51 weeks                     | Nursery-specific opening weeks not captured; assumption stated per line               | Capture per-nursery weeks in FeeSchedule when extraction lands (schema slot exists) |
| UC figures re-asked after reload                         | Memory-only privacy stance (ADR 0007) costs repeat-visit friction                     | User feedback; a consent-based "remember on this device" was the runner-up option   |
| Engine `MonthlyGross`/line types are plain TS internally | Zod validation happens at CostProjection exit                                         | Fine unless internal shapes start crossing package boundaries                       |

## Not yet started

| Item                                | Notes                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Phase 2 design doc + task breakdown | The next major work; needs owner approval before implementation (spec workflow)               |
| `docs/experiment-log.md`            | Deliberately starts with the first Phase 3 extraction experiment                              |
| EES data API verification           | Would unlock structured regional fee benchmarks; research flagged it promising but unverified |
| Framework dogfood report            | After Phase 2 runs through /task a few times: what worked, what's ceremony                    |

## Standing rules that govern the revisit itself

Sketch-first for refactors; adopt-first for tooling; scope decisions get costed options, not pre-decisions; gates are never weakened to pass; every government figure re-verifies through /verify-rule. Conflict hierarchy: spec > CLAUDE.md > standards > preference.
