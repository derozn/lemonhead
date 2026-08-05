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

## 2026-08-05 — A refactor built, shown, and rejected

The owner asked for a clean-architecture pass on `gross.ts` (nested loops, reduces, hashmap indexing). A full decomposition was built and shown before committing: a per-band pricing index, an orchestrator plus six single-purpose functions, reduces replaced with explicit loops, behaviour pinned byte-identical by the penny-exact tests. The owner judged it worse than the original and discarded it, deferring structural polish until after the PoC. Lesson recorded: sketch one function's before/after and get a verdict before converting a file. The episode is kept here because "what didn't work" is a section of the final write-up, and this is a legitimate entry: decomposition that satisfies checklists can still lose to a cohesive algorithm read top to bottom.
