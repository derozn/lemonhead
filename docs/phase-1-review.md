# Phase 1 review

**For the owner's whole-phase review of PR #6.** Written 2026-08-05, when tasks 6 through 12 landed on one branch by agreement.

## What Phase 1 shipped, against the spec's bar

The spec's Phase 1 definition: schemas and entitlements with full test coverage, plus a web app doing manual fee entry → itemised, explainable projection, shipping as a useful calculator on its own. That exists and works end to end: enter a price list, answer the questionnaire, get twelve months of itemised costs where every line links to your price list or a gov.uk rule checked on a stated date.

- **198 tests**, `packages/entitlements` held at 100% line and branch coverage by CI throughout.
- **Eight hand-worked acceptance scenarios** (`docs/acceptance-scenarios.md`), penny-exact, including two UC households.
- **Every government parameter verified against gov.uk or DWP publications on the day it was encoded**, cited with quote and retrieval date in the params files.
- **Property-based tests forced three real product rules** the spec never stated: deductions cap at the discounted fee; funding is withheld (and explained) when consumables would cost more than it saves; blank money inputs fail validation rather than becoming £0.
- **ADRs 0001–0007** and a dated build log (`docs/build-log.md`) carrying the narrative for the §10 write-up.

## Where the design changed during the build, all documented as it happened

UC status became a discriminated union (claimant-without-figures is unrepresentable); the benefit-cap question was deleted because it is computable from collected earnings; `allInPaidWork` was added because it is the UC childcare element's actual test; session hours got a kind-aware cap after a test exposed the 24-hour limit as wrong for weekly sessions; `assessFundedHours` returns a structured pair instead of an array. The nursery funding conditions you asked for mid-design are schema fields, engine rules, and named tests.

## Known deferrals, none blocking the phase

- Vercel project link and the actual protected-preview deploy are owner steps; the middleware and build are ready (`PREVIEW_PASSWORD` env var arms the gate).
- The web app is deliberately PoC-grade in polish: no comparison view (Phase 4 per spec), minimal styling, no accessibility pass yet.
- `next build` runs locally but is not yet a CI step.
- One `/simplify`-style structural pass on `gross.ts` was built and rejected; structural polish is parked until after the PoC by your call.

## Starting points for your two standing concerns

**AI-assisted development.** What exists: the PR-guard hook enforcing build-log updates, CLAUDE.md carrying the hard rules and boundaries, memory files capturing your working preferences, and the `/simplify` multi-agent review used once with a good hit rate. Worth discussing for Phase 2: a pre-PR review hook (or `/code-review` habit) with the same enforcement as the build-log guard; project-scoped skills for the recurring flows (task branch → validate → PR); and whether the eval harness work in Phase 2 should itself be the testbed for a more structured agent workflow, since it is the most AI-native part of the project.

**Codebase standards.** What exists and is enforced mechanically: strict TS everywhere, lint-enforced engine purity and package boundaries, commitlint scopes, the validate gate, 100% coverage on the engine, exact dependency pins. The gaps worth a standards doc: React/JSX conventions (no react-hooks or a11y lint rules yet), component structure and naming in `apps/web`, error-message copy style, CSS conventions (currently one ad-hoc global sheet), and a documented policy on when engine rules deserve an ADR versus a build-log entry. Suggest we write `docs/standards.md` together at the start of Phase 2 rather than retrofitting mid-phase.

## Suggested review order

1. `docs/acceptance-scenarios.md` beside `packages/entitlements/src/engine/acceptance.test.ts` — the correctness story.
2. `packages/entitlements/src/engine/` — the pipeline in execution order: timeline, gross, funding, tax-free-childcare, universal-credit, projection.
3. `packages/schemas/src/` — the shapes everything hangs off.
4. `apps/web/src/` — the calculator itself; run `pnpm --filter @lemonhead/web dev`.
5. `docs/build-log.md` — what happened along the way, including what failed.
