# Full project revisit — 2026-08-06

The fresh-eyes audit of the whole project after Phase 1 and the AI-dev framework, run before Phase 2 design as planned. Every verdict below is the owner's, given one decision at a time in the revisit session. This document is the record; the backlog, spec v1.2, ADR 0008, and the build-log entry of the same date are the downstream edits.

Session rules honoured: docs-only (every code change became a task), spec amendments owner-approved before editing, no backlog item dropped without an explicit verdict.

## 1. Foundations audit

The project's claims were re-tested independently, not read off the docs.

### What held

- `pnpm validate` passes end to end: 212 tests green (the phase-1 review recorded 198; the count grew after close-out), `packages/entitlements` at 100% line and branch coverage, `packages/schemas` at 98% with one uncovered line (`fee-schedule.ts:229`).
- `pnpm build` compiles clean, and CI now runs `pnpm validate`, the hook pipe-tests, and `pnpm build` (`ci.yml:24-26`). The phase-1 review's admission that `next build` was not a CI step is stale in the good direction.
- All 10 hook pipe-tests pass. The citation guard blocks an uncited params file with exit 2; the PR guard blocks a branch with no build-log change and correctly exempts docs-only branches.
- Spot re-verification of one government parameter end to end via /verify-rule: the UC childcare element caps (£1,071.09 one child, £1,836.16 two or more) match the live gov.uk guidance page and the DWP 2026/27 rates publication exactly. Fresh retrieval date 2026-08-06, no page update since encoding.
- Engine purity is clean. A read-only reviewer pass over every file in `packages/entitlements/src` found no clock reads, no randomness, no IO, no `any`, no unchecked casts, no imports beyond `@lemonhead/schemas`, and citations present in all three params files, asserted programmatically by `registry.test.ts`.

### What did not hold

1. **The money boundary is violated six times.** ADR 0001 confines multiply and divide on Pence to `money.ts`, yet six call sites divide Pence by 100 for display: `engine/funding.ts:265` (twice on one line), `engine/tax-free-childcare.ts:71`, `eligibility/tax-free-childcare.ts:90`, `engine/universal-credit.ts:72,83`, `eligibility/universal-credit.ts:84`. All six are formatting inside explanation strings, so no computed figure is wrong and NFR4 survives. But the two hand-rolled formats disagree with each other (one renders "£1000", the other "£1836.16", neither with thousands separators, neither matching the web app's `pounds()`), and no test asserts any of these strings.
2. **The detection grep for the money rule catches nothing.** The exact command in `docs/ai/rules.md` missed all six sites and matched only a JSX closing tag and two comments. ESLint has no Pence-arithmetic rule either, so the highest-tier rule in the rulebook had no mechanical enforcement at all.
3. **Two enforcement claims are softer than documented.** The UC memory-only grep watches `storage.ts` only; nothing mechanical stops a future file elsewhere in `apps/web` persisting UC fields (today's storage test does prove absence, so this is future-proofing, not a live leak). The citation guard is PostToolUse, so an uncited write is already on disk when it fires; it nags-after rather than gates. framework.md's "exit-2 blocking, pipe-tested" describes two of the four hooks.
4. **Doc staleness cluster.** Test count 198 vs 212; CLAUDE.md's "apps/web (task 10+)"; spec still labelled Draft v1.1; standards.md still "Draft for owner review"; the phase-1 review proposing tooling that now exists; build-log framework entries sitting newest-first at the head of a newest-last file, with no entry for the Turborepo adoption or the task-13 close-out. All fixed in this revisit's PR.
5. **Citation quotes are paraphrases.** The `quote` fields in the params files read as stitched summaries rather than verbatim gov.uk extracts (the live UC page says "increased to £1,071.09 for one child"; the file's quote words it differently). Promoted to a do-now fix by owner verdict.

Findings 1 to 3 are code changes and became the Phase 1.5 money-boundary task (see §3, items A and B). Finding 4 is fixed in this PR. Finding 5 is Phase 1.5 item C.

## 2. Decision re-review

Every ADR and major Phase 1 design choice was re-judged from scratch. Verdicts:

| Decision                                                | Verdict today                                                                                                                                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR 0001 money as branded integer pence, no library     | Same decision. Exit criteria right, neither fired. Silent on display formatting, which is where the six violations grew; refined by ADR 0008.                                                                                           |
| ADR 0002 per-scheme dated params, composite rule-set id | Same decision, no reservations. Today's live re-verification worked because of this structure. The strongest ADR of the seven.                                                                                                          |
| ADR 0003 month-aware 12-month projection                | Same decision. The static snapshot would be materially wrong near birthdays and term boundaries, which is the product's reason to exist.                                                                                                |
| ADR 0004 England-only v1 with jurisdiction enum         | Same decision. Gap noted: no revisit trigger for adding nations; demand signal or the Phase 6 launch review is the natural one.                                                                                                         |
| ADR 0005 Zod single source of truth                     | Same decision. Already paying twice: defensive-free engine now, JSON-schema emission for Phase 3 extraction later.                                                                                                                      |
| ADR 0006 UC full modelling for claimants only           | Same decision, now with the assistant agreeing. Taken twice against advice; the pass-through mechanics made the claimant path exact, encoding it improved the questionnaire twice, and signpost-only would have been the worse product. |
| ADR 0007 UC figures memory-only                         | Same decision on the stance. Enforcement was thinner than the ADR implies; widening it is Phase 1.5 item B.                                                                                                                             |
| Full-schedule manual fee entry (owner, against advice)  | Agree today: the manual form forced the complete FeeSchedule shape into real use, building the Phase 3 extraction contract's test bed early.                                                                                            |
| localStorage-only, no accounts                          | Same decision.                                                                                                                                                                                                                          |
| Multi-child schema from day one                         | Same decision; cheap insurance that avoided a later breaking change.                                                                                                                                                                    |
| TS pin 6.0.3, import-x, Turborepo                       | All defensible; backlog rows already track the revisit moments.                                                                                                                                                                         |
| Tasks 6–12 in one PR                                    | A real breach of one-task-one-PR, agreed at the time. Recorded here as a one-off; the rule stands.                                                                                                                                      |

**New decision (owner, 2026-08-06): the engine emits pence, the UI formats pounds.** Engine explanation lines will carry raw Pence values in structured fields; `apps/web` interpolates through its existing `pounds()`. Recorded as ADR 0008, refining ADR 0001. Alternatives considered: a sanctioned formatter beside `money.ts` (keeps the engine in the display business), and blessing the status quo with dedupe and tests (would make engine-side formatting permanent).

## 3. Backlog triage

Every row received an explicit owner verdict: do-now, keep-parked (trigger confirmed), or drop. Zero drops.

### Do now

| #       | Item                                                 | Verdict notes                                                                                                                                                     |
| ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2       | Vercel project link + `PREVIEW_PASSWORD`             | Owner step; unblocks preview sharing and remote cache.                                                                                                            |
| 3       | `gross.ts` structural polish                         | Owner promoted from parked: sketch-first pass on one function, verdict-gated, next code session.                                                                  |
| 7       | /collect-sheet skill + fee-sheet-analyst agent       | Owner promoted: build ahead of the first collection task, within Phase 2.                                                                                         |
| 8       | /experiment skill + experiment-log hook              | Owner promoted: build during Phase 2 so Phase 3 starts instrumented.                                                                                              |
| 11      | Comparison view (FR4)                                | Owner promoted from Phase 4; moved into Phase 1.5 by spec amendment v1.2.                                                                                         |
| 14      | Coverage gate covers entitlements only               | Cover `fee-schedule.ts:229`, add a schemas coverage threshold.                                                                                                    |
| 15      | First `next build` cache miss after checkout         | Owner promoted: fix the `next-env.d.ts` tracked-input mutation now.                                                                                               |
| 21      | Phase 2 design doc + task breakdown                  | First work after Phase 1.5; owner approval gates implementation per spec workflow.                                                                                |
| A (new) | Money-boundary fix per ADR 0008                      | Pence fields on explanation lines, web-side formatting, type-aware ESLint rule banning Pence arithmetic outside `money.ts`, string tests, rules.md grep replaced. |
| B (new) | Widen UC memory-only enforcement beyond `storage.ts` | Bundled with A.                                                                                                                                                   |
| C (new) | Verbatim citation quotes in all three params files   | Owner promoted from parked: dedicated small PR, quotes re-fetched via /verify-rule.                                                                               |

### Keep parked (trigger re-confirmed)

| #    | Item                                                                         | Trigger                                                                             |
| ---- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | Trademark clearance + domain                                                 | Before any public launch under the name                                             |
| 4    | Lex MCP wiring                                                               | First time /verify-rule needs SI text                                               |
| 5+23 | Ofsted ingest + `fee_benchmark` + EES API verification (merged into one row) | Directory/comparison feature, or Phase 3 wanting regional fee sanity bounds         |
| 6    | PROJECT_INDEX convention                                                     | Owner kept over a drop recommendation; trigger stands: when navigation cost appears |
| 9    | shadcn + CSS Modules                                                         | Phase 4 UI build                                                                    |
| 10   | Playwright e2e + screen-reader pass                                          | Phase 4; every new flow respectively                                                |
| 12   | TS pinned 6.0.3                                                              | Renovate surfaces the unpin                                                         |
| 13   | jsx-a11y peer warning                                                        | Plugin release or maintained fork                                                   |
| 16   | Turbo remote cache / `--affected`                                            | CI time or package count grows; Vercel link lands via item 2                        |
| 17   | TFC calendar-quarter approximation                                           | User feedback showing material boundary error                                       |
| 18   | 51-week billing assumption                                                   | Extraction captures per-nursery weeks (Phase 3)                                     |
| 19   | UC figures re-asked on reload                                                | User feedback on the friction                                                       |
| 20   | Engine internal plain TS types                                               | Internal shapes crossing a package boundary                                         |
| 22   | `docs/experiment-log.md`                                                     | First Phase 3 experiment                                                            |
| 24   | Framework dogfood report                                                     | After several Phase 2 /task runs                                                    |

### Dropped

None.

## 4. Roadmap from here (spec §8, amended to v1.2)

- **Phase 1.5 — Revisit hardening (new).** Roughly six small task-PRs plus one owner step: money boundary per ADR 0008 bundled with the UC-guard widening (S); schemas coverage threshold (XS); `next-env.d.ts` fix (XS); `gross.ts` sketch-first pass (S, verdict-gated); verbatim citation quotes (XS); comparison view FR4 (M, the largest item); Vercel link (owner, minutes). Order of one to two weeks of sessions.
- **Phase 2 — Eval scaffolding, plus framework Phases B and C.** Design doc first (owner-gated), then golden-set collection through /collect-sheet and the fee-sheet-analyst agent, the eval runner against a stub extractor at an honest 0% baseline, and the /experiment skill and hook built here so Phase 3 starts instrumented. Size M; the design doc owns the breakdown.
- **Phase 3 — Extraction pipeline.** Unchanged. Experiment log starts here; per-nursery-weeks capture and possibly regional sanity bounds trigger inside it.
- **Phase 4 — Product integration, minus comparison view.** Upload flow, streaming progress, confidence-flagged review UI, source-region highlighting. shadcn/CSS Modules and Playwright trigger here.
- **Phase 5 — Observability + hardening** and **Phase 6 — Write-up & launch.** Unchanged. Trademark stays the launch gate; the dogfood report feeds the write-up.

Nothing in the spec was found experience-invalidated beyond the phase-plan structure. NFR3's ≤£0.05 per document target stands untested until Phase 3, with no evidence against it.
