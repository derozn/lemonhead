# Build log

The running narrative behind the code: what happened, what broke, what got decided, with the numbers. Raw material for the §10 write-up. One dated entry per meaningful event, newest last. The extraction experiment log is a separate document (`docs/experiment-log.md`) and starts with the first prompt experiment in Phase 3.

## 2026-08-05 — Design review and the decisions that shaped Phase 1

Design and task breakdown reviewed with the owner in a question-at-a-time grilling. Nine decisions resolved (spec §11.2–11.9). Two went against the assistant's recommendation, both towards more scope: full UC award modelling for claimants (refined to the claimant-only boundary in ADR 0006 after working the taper mechanics) and full-schedule manual fee entry. The rest: England-only, month-aware 12-month horizon, localStorage-only, manual golden-set collection, monetisation deferred, multi-child schema from day one.

Verification lesson on day one: a third-party site in the research results gave the Tax-Free Childcare disabled-child age limit as 17. gov.uk says 16. The spec's rule that only gov.uk counts as a citation source proved itself before any code existed.

## 2026-08-05 — Scaffolding (task 1, PRs #1)

pnpm workspace, strict TS, Vitest with a 100% coverage gate scoped to `packages/entitlements`, ESLint strict type-checked, lefthook + commitlint, the `pnpm validate` aggregate gate mirrored in CI, Renovate, knip, cspell, syncpack with exact pins. Conventions harvested from the owner's two existing repos by parallel inventory agents.

Two fights: TypeScript resolved to 7 (the native compiler) but typescript-eslint supports only up to 6.0, so TS is pinned at 6.0.3 until typed linting catches up. And `eslint-plugin-import` crashes under ESLint 10, swapped for the maintained `eslint-plugin-import-x` fork. pnpm 11 also ignores `.npmrc` save-exact in workspaces; exact pinning moved to `savePrefix` in `pnpm-workspace.yaml` with syncpack as backstop.

The design's purity rules became lint rules: `Date.now()`, argless `new Date()`, `Math.random()`, and `node:*` imports are banned in `packages/entitlements`, and package boundaries are enforced by `no-restricted-imports`. "How do you know the engine is pure?" now has the answer "the linter fails the build if it isn't."

## 2026-08-05 — Schemas (tasks 2–3, PRs #2–#3)

`Pence` as a branded integer, `IsoMonth` for month-precision DOBs, `FamilyProfile` with UC status as a discriminated union so a claimant household without its figures is unrepresentable. `FeeSchedule` designed once for manual entry and later extraction: months-based age bands validated non-overlapping, sessions on a quarter-hour grid, referential integrity checked at parse time, and the `FundingPolicy` union including the owner-requested nursery funding conditions (minimum days per week, capped funded hours, term-time-only, session restrictions) plus an honest `unknown`.

Money-library discussion resolved: no bignumber.js/dinero.js, integer pence with recorded exit criteria (ADR 0001). The owner's tripwire: if avoiding the library accumulates guardrails, adopt it.

## 2026-08-05 — Rules and eligibility (task 4, PR #4)

Every parameter re-verified against gov.uk and the official DWP 2026/27 rates document on the day of encoding, cited with quotes and retrieval dates. The DWP rates PDF resisted the fetch tooling and was extracted locally with pdftotext: work allowances £710/£427, childcare caps £1,071.09/£1,836.16, taper 55%.

Verification changed the product: the benefit-cap exemption (£881/month) tests net earnings we already collect, so a planned question was deleted and computed instead; `allInPaidWork` was added because it is the UC childcare element's actual work test and nothing captured it.

The coverage gate earned its keep: it refused to pass until the registry's pick-latest-of-several params logic, which every future rates change relies on, had direct tests.

## 2026-08-05 — Gross fees (task 5, PR #5)

Timeline builder with mid-horizon band transitions, `money.ts` as the only home of Pence multiplication (one round-half-up per operation, in exactly one implementation), deterministic session selection with every non-exact choice stated as a user-facing assumption, annualised monthly billing, sibling discounts, six extras cadences, refundable deposits shown but excluded from totals.

A test exposed a real schema bug: `SessionDef` capped hours at 24, which is wrong for weekly sessions; the cap is now kind-aware. Hand-computed totals for all three nursery fixtures match to the penny, including the November band transition and the sibling discount recomputing when the younger child moves up. First fast-check property suite: lines sum exactly to totals, gross never negative, monotonic in days booked.

A four-agent `/simplify` review then cut 259 lines against 238 added: shared test builders, branded ids kept through the engine, structured `assumptions[]`, the design's `unknown-flag` line kind, hourly-hours validation. Deliberately skipped: using `sumPence` in the lines-sum property (the plain reduce is the independent oracle) and all caching (12-month scale).

## 2026-08-05 — Funding application (task 6)

The owner's nursery-rules request from the design review is now enforced in code: minimum days per week, capped funded hours, term-time-only, and session restrictions each produce an explainable "funding not applied" line naming the rule, never a silently missing deduction. All three policy variants deduct differently (proportional at the booked rate, at the stated funded rate, or whole allocated sessions), and unknown policies flag rather than guess.

Two things fell out of the maths. Deductions compute in annual quarter-hours divided by 12 once, so the stretched-offer conversion needs no separate formula: hours/week × weeks ÷ 12 equals annual ÷ 12 and the weeks cancel. And a property test forced a real rule decision: a full deduction plus a sibling discount could push a child's month negative, so deductions cap at the child's discounted fee.

The coverage gate also forced an API fix: assessFundedHours returned an array callers had to .find() schemes out of, leaving provably-dead undefined branches; it now returns a structured { workingParent, universal } object.

Satisfying hand-check: a 3-day family at Sunny Bank has exactly 1,140 attended hours a year, so the 30-hour offer funds the entire bill and the projection collapses to the consumables charge: £90.25 a month.

CI then caught what local runs had not: with a different random seed, the property suite found a family attending 4 hours a week whose flat weekly consumables charge (£87.08/month) exceeded the funding saving (£72.20/month), so "applying funding" pushed net above gross. That is a real situation in which real parents decline funded places, and the engine now does the same: funding is withheld with a line stating both figures and suggesting the conversation to have with the nursery. The counterexample is pinned as a named regression test. This is the second engine rule a property test has forced (the first was capping deductions at the discounted fee), which is the argument for property-based testing in one sentence.

## 2026-08-05 — TFC, UC, and the assembled projection (tasks 7–9)

Tax-Free Childcare tops up 20% of each eligible child's out-of-pocket costs with the quarterly caps tracked per child (calendar-quarter approximation, stated on every line). Universal Credit gets the full claimant treatment decided at the design review: the element computed exactly for working claimants with a positive award, a £0 award or unsure answers producing signposts rather than estimates, and the benefit-cap warning computed from stated earnings. Mutual exclusivity costs nothing: the TFC assessor already rules out UC households.

`calculateProjection` became the engine's single public entry point, and it parses its own output through the `CostProjection` Zod schema, so an invalid projection cannot leave the package. Eight acceptance scenarios (two UC households) are hand-worked in `docs/acceptance-scenarios.md` and encoded penny-exact; the richest one runs a single parent on UC with two children through band transitions, a term-boundary funding start, a sibling discount interacting with the deduction cap, and the 85% element, and the engine matched the hand arithmetic first run.

## 2026-08-05 — The web app (tasks 10–12)

Next.js, client-side only: the engine runs in the browser, so no server ever sees a family's data. Full-schedule nursery entry, progressive UC disclosure with the memory-only promise stated next to the money fields, and a projection view where every line shows its source (gov.uk links with retrieval dates) and its assumptions. A storage test proves the UC figures never reach localStorage. Basic-auth middleware holds the trademark gate. The form tests caught a real bug before any user could: blank money inputs parsed as £0.00 instead of failing validation, which for a UC award would have silently turned "didn't answer" into "award is zero".

## 2026-08-05 — A refactor built, shown, and rejected

The owner asked for a clean-architecture pass on `gross.ts` (nested loops, reduces, hashmap indexing). A full decomposition was built and shown before committing: a per-band pricing index, an orchestrator plus six single-purpose functions, reduces replaced with explicit loops, behaviour pinned byte-identical by the penny-exact tests. The owner judged it worse than the original and discarded it, deferring structural polish until after the PoC. Lesson recorded: sketch one function's before/after and get a verdict before converting a file. The episode is kept here because "what didn't work" is a section of the final write-up, and this is a legitimate entry: decomposition that satisfies checklists can still lose to a cohesive algorithm read top to bottom.
