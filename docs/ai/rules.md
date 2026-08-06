# Rules with teeth

Conflict hierarchy: `docs/spec.md` > `CLAUDE.md` > `docs/standards.md` > anyone's preference. 🔴 rules block merges; 🟡 rules need a written reason to break. Each rule: ✅ right, ❌ wrong, and a detection command where one exists.

## 🔴 Money

- ✅ `applyPercent(amount, 85)` in the engine. ❌ `month.total * 0.85` in a component, a script, or an agent's prose.
- Detection: `grep -rnE "\w+Pence\w*\s*[*/]|[*/]\s*\w+Pence" apps/ packages/ --include="*.ts*" | grep -v "money.ts" | grep -v "\.test\."` — a name-based tripwire only; the gate is the type-aware ESLint no-Pence-arithmetic rule (Phase 1.5 money-boundary task, ADR 0008). As of 2026-08-06 this grep matches five known display-formatting sites (plus one it cannot see in `funding.ts`, whose variables lack the Pence suffix); expect empty once that task lands. The 2026-08 revisit replaced the original pattern here, which matched none of the real violations.

## 🔴 Citations for government figures

- ✅ A dated params file with `{ url, quote, retrievedOn }` for every figure, created via /verify-rule. ❌ "The cap is £2,000" from memory, or editing an old params file in place.
- Detection: `grep -rL "retrievedOn" packages/entitlements/src/rules/*/params/` (expect empty).

## 🔴 Engine purity

- ✅ `calculateProjection(schedule, profile, { asOfDate })`. ❌ `new Date()` anywhere in `packages/entitlements`.
- Detection: `grep -rnE "Date\.now|new Date\(\)|Math\.random" packages/entitlements/src` (expect empty; lint also blocks).

## 🔴 UC figures are memory-only

- ✅ `saveFamily` strips the claimant money fields; the storage test proves absence. ❌ Any persistence or network call that can see `netMonthlyEarnings`.
- Detection: `grep -rn "netMonthlyEarnings\|currentMonthlyAward" apps/web/src/lib/storage.ts` (expect only the stripping comment/logic, never a write).

## 🔴 Gates are not negotiable

- ✅ Fix the code until `pnpm validate` passes. ❌ Lowering a coverage threshold, disabling a lint rule, skipping a test, or `--no-verify`.
- Detection: diff review of `vitest.config.ts`, `eslint.config.mjs`, `.claude/settings.json` in any PR that "fixed" CI.

## 🟡 One task, one PR

- ✅ The diff matches the task's done-when; discoveries become notes for the owner. ❌ "While I was in there…" scope creep.

## 🟡 Paper trail in-PR

- ✅ Build-log entry rides the same PR (hook-enforced); ADR when a decision constrains future code. ❌ Batching documentation "at the end of the phase".

## 🟡 Honest reporting

- ✅ "Tests fail on X; here is the output." "Untested." "MVP." ❌ "Blazingly fast", "production-ready", invented percentages, or declaring done past a red check.

## 🟡 Sketch-first refactors

- ✅ One function's before/after, owner verdict, then the file. ❌ A wholesale restructure arriving as a fait accompli (rejected once already; see build log).

## 🟡 Brand copy

- ✅ At most one citrus metaphor per surface; zero near money or errors; England-only stated plainly. ❌ Squeeze puns in a validation message.
