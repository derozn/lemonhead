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

## 2026-08-05 — The AI-dev framework, PR A1: agents, skills, and governing docs

Post-Phase-1, the owner commissioned an in-house AI-assisted development framework, patterned on a study of the SuperClaude Framework (400 files; verdict: ~20 carry the weight) and a survey of the UK gov data and MCP landscape (GOV.UK Content API is a no-auth structured goldmine with change history; the MCP niche for it is empty; no structured nursery fee data exists anywhere, which validates the whole product).

Design principle, one sentence: the LLM proposes; hooks, lint, and the engine dispose. SuperClaude's prose-only "Will Not" boundaries became real mechanisms here: the reviewer agent is read-only because it has no write tools; the policy-analyst cannot compute money because it has no execution tools and the engine owns arithmetic; params files without citations will be blocked by a hook (PR A2), not a plea.

This PR lands four agents (reviewer, policy-analyst, engine-dev, web-dev), five flow skills (/task, /plan-gate, /verify-rule, /troubleshoot, /review), and the three governing docs (framework, rules-with-detection-greps, routing). Owner directives baked in: adopt-first for MCP servers and skills (context7, Lex, official fetch adopted; only govuk-mcp built, because the niche is verifiably empty), and external framework skills (the Vercel suite, turborepo, claude-api, dataviz) routed to rather than duplicated. Owner decisions: domain agents advisory-only; govuk-mcp pulled into Phase A; full five skills; split implementers.

## 2026-08-05 — The AI-dev framework, A2: deterministic gates

The hooks that make the framework's promises mechanical: a SessionStart script orienting every session (branch, dirty count, last build-log entry, active tasks doc), a params-citation guard that rejects any edit to a rules params file lacking a gov.uk URL and retrieval date (verify-on-encode is now enforced, not urged), and a Stop-time reminder for uncommitted work. All are pipe-tested in CI (tools/ai/hooks.test.sh), and the tests immediately caught a harness bug: piping stdin into only the first segment of a hook command puts the jq assignment in a subshell and silently voids the test — every guard now receives stdin as Claude Code actually delivers it. docs/standards.md lands the deferred web conventions, with react-hooks and jsx-a11y lint now part of validate.

## 2026-08-05 — The AI-dev framework, A3: the govuk-mcp server

The one build the adopt-first policy permits: a stdio MCP server wrapping the GOV.UK Content and Search APIs (tools/govuk-mcp, TypeScript SDK v2), because the research found nothing above 11 stars in that niche. Three read-only tools (get_content, search, diff_since), every result carrying its source URL and public_updated_at, all HTTP behind a client adapter so the announced GDS GraphQL exploration is a one-file migration. Zod-validated at the API boundary, fixture-tested without live calls in CI, and live-smoked against the real API: the free-childcare guide returns seven parts, and usefully, no change_history on that schema, which validates the watcher's fallback to public_updated_at comparison. Two ecosystem potholes hit and recorded: jsx-a11y's peer range stops at eslint 9 (works under 10), and Node's strip-only TS runner rejects constructor parameter properties, now banned repo-wide via erasableSyntaxOnly so the compiler catches the class before the runtime does. Lex adoption is approved but deliberately unwired until /verify-rule first needs SI text: it requires self-hosting and a dead .mcp.json entry helps nobody.

## 2026-08-05 — The AI-dev framework, A4: the rule watcher

Nightly GitHub Actions cron, deterministic end to end: no LLM anywhere in the detection path. Stateless by design — pages mapped to params files are compared against the retrievedOn dates already recorded in their citation blocks (no snapshot store to babysit); unmapped pages use a 3-day polling window; calendar triggers cover the dates diffs cannot predict (mid-December DfE rates, Budget season, 1 April, 1 September). Findings become deduped rule-change issues, never PRs: verify-on-encode stays a human act, the watcher only rings the bell. Pure decision functions unit-tested; a local run against the live API correctly produced zero findings (nothing has changed since today's retrieval dates, which is exactly the point).

## 2026-08-06 — Full project revisit: audit, re-decisions, triage, roadmap

The planned fresh-eyes revisit before Phase 2 design, run docs-only with every verdict owner-gated (full record: `docs/revisit-2026-08.md`). Independent verification first: `pnpm validate` green with 212 tests (198 at phase close; the count grew), entitlements still at 100% line and branch, `pnpm build` green, all 10 hook pipe-tests pass, and the UC childcare caps re-verified against live gov.uk through /verify-rule with a fresh 2026-08-06 retrieval: £1,071.09 and £1,836.16 both match, no page change since encoding.

The audit's real catch: six call sites divide Pence by 100 for display formatting outside `money.ts`, in two inconsistent hand-rolled formats, and the money rule's detection grep in rules.md matched none of them. No computed figure is wrong (all six are explanation strings), but the highest-tier rule had no working tripwire. Owner decision: the engine emits pence, the UI formats pounds (ADR 0008); implementation is a Phase 1.5 task with a type-aware lint rule, and rules.md carries an honest interim grep. Also found: the UC memory-only grep watches one file, and the citation guard fires after the write lands rather than before.

All seven ADRs re-affirmed, including the two decisions taken against assistant advice, both of which the evidence now favours. Backlog triage: 11 do-now (the Phase 1.5 hardening batch, with comparison view FR4 pulled forward from Phase 4), 15 kept parked with triggers re-confirmed, zero dropped. Spec amended to v1.2. This entry also moves the framework entries above into chronological position; they had sat newest-first at the head of a newest-last file.

## 2026-08-06 — Phase 1.5: the engine emits pence, the UI formats pounds

ADR 0008 implemented. The six `/100` display sites in the engine became `{placeholder}` templates with the raw Pence values in a new optional `amounts` record on `ProjectionLine` and eligibility reasons; `apps/web` interpolates them through one `renderAmounts` helper built on the existing `pounds()`. Copy stays engine-side with its citations; formatting has exactly two legal homes, `money.ts` for arithmetic and `format.ts` for display, and a new type-aware lint rule (`lemonhead/no-pence-arithmetic`, reading the checker via parser services) enforces that repo-wide for `*`, `/`, and `%`. The rule earned its keep before the PR existed: it caught four pre-existing `(pence / 100).toFixed(2)` sites in the nursery form that every name-based grep had missed, now routed through a `penceToInputString` helper in `format.ts`.

The regression net (no engine string may match `/£\d/`, and placeholders must pair one-to-one with amounts keys) forced four sites beyond the audit's six, and one of them exposed a latent units bug: the TFC params file stored `parentPaysPence: 8` and `governmentAddsPence: 2`, pounds in pence-named fields. No computed figure was ever wrong (nothing did arithmetic on them; the old copy hard-coded "£8"/"£2") but the values are now 800/200 with the type tightened to `NonNegativePence`, and the correction is covered by the file's existing gov.uk citation. `+`/`-` stayed out of the lint ban deliberately: the property suites re-derive totals with plain reduces as oracles independent of `money.ts`, and banning the operators would force the oracles through the helpers they exist to check; production code nonetheless now routes every Pence sum through `sumPence`/`negate`.

The UC memory-only promise also gained its mechanical guard: browser persistence APIs (localStorage, sessionStorage, document.cookie) are lint-banned across `apps/web/src` except `storage.ts`, the single choke point whose stripping behaviour the storage test proves (the test file itself stays exempt: it reads raw localStorage on purpose, to avoid trusting the code it checks). 247 tests, entitlements coverage held at 100%. One reviewer finding declined deliberately: the projection view still shows eligibility as status chips without the reason messages, so the reasons' new placeholder wiring has no web call site yet. Rendering reasons is a UI task in its own right, now on the backlog; the catch-all test will trip if a raw token ever reaches the DOM.

## 2026-08-06 — Phase 1.5: schemas join the 100% gate

The revisit verdict on the coverage trade-off row, landed. The one uncovered line (the duplicate-session-id branch, never exercised since task 2) got its test, and the two remaining partial branches turned out to be unreachable defensive guards forced by noUncheckedIndexedAccess: an indexed-access check in the age-band overlap loop and a `?? ''` after splitting a key that always has two parts. Both loops were restructured minimally so every branch is reachable (a `previous` tracker instead of indexed access; seen/reported sets instead of split-and-rejoin), messages and counts unchanged and pinned by a new triple-duplicate test. One subtlety preserved: price-pair keys join on a NUL character, not a space, so ids containing spaces cannot collide; the refactor keeps that separator. `packages/schemas` now sits under the same 100% line/branch/function/statement threshold as the engine, which matters because these schemas become the LLM-output validation boundary in Phase 3. 248 tests.

## 2026-08-06 — Phase 1.5: citations become verbatim, and two of them were wrong

The quote-tightening task turned out to be more than cosmetic. Re-fetching every cited source (six gov.uk pages live, two PDFs through the local page extractor) found all the paraphrased quotes numerically faithful, but two citations claimed things their sources never say: the 55% taper rate was attributed to the DWP 2026/27 rates PDF, which contains no taper row on any of its 14 pages (the taper is set by regulation, not the uprating statement), and the 38-week basis for the universal 3-4 and extra-support-2s streams was attributed to a DfE PDF that states 38 weeks only for the working-parent stream. Both values were confirmed correct against pages that do state them verbatim (the UC wages guidance page for 55p-per-£1; the two gov.uk childcare pages for 15 hours over 38 weeks), and those pages are now the cited sources. Every quote in all three params files is now a character-exact extract with a fresh 2026-08-06 retrieval date, non-contiguous extracts joined with ellipses, and table rows quoted as rows.

Process note recorded deliberately: rules.md says never edit an old params file in place, and these edits do exactly that. The rule protects figures and effective dates, and no figure or date moved here; a new 2026-08-06-dated file would have fabricated a rule change that never happened. The owner's revisit verdict ordered this shape. Also noted for the rule watcher: the old free-childcare "2-to-4" slug now redirects; the canonical pages are per-age-group.

## 2026-08-07 — gross.ts examined and left alone

The sketch-first pass the revisit promoted ran its course in one round. Fresh read of the file: `weeklyCostFor` is a clean priority cascade and `calculateGross` reads top to bottom; no decomposition was proposed (that shape lost once already). The only candidate worth sketching was a defaults-filling `grossLine()` constructor to strip the repeated literal boilerplate at the four line-construction sites. Sketch shown, owner verdict: keep the explicit literals, every field visible at every site beats hiding defaults behind a helper. The backlog row closes as examined-and-kept, which is the sketch-first rule working as intended: one function, one verdict, no wasted diff.

## 2026-08-06 — Phase 1.5: next-env.d.ts stops being a tracked input

The first-checkout cache-miss row, fixed at source rather than waited out. Root cause reproduced: `next dev` writes `./.next/dev/types/...` imports into `next-env.d.ts` while `next build` writes `./.next/types/...`, so whichever ran last left a tracked file dirty and busted Turbo's input hash. Current Next.js docs settled the fix: the file is an internal implementation detail, belongs in .gitignore, and `next typegen` exists to generate it in CI without a full build. So the file is untracked and ignored (git and prettier), and the web typecheck script became `next typegen && tsc --noEmit`. Verified both ways: a simulated fresh checkout (file and .next deleted) runs validate green, and a simulated dev/build alternation now gets a FULL TURBO cache hit where it previously missed. The revisit session itself proved the row's premise mid-flight when a stray `pnpm build` dirtied the file during an unrelated docs PR.
