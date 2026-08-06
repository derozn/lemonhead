# ADR 0008: The engine emits pence; the UI formats pounds

**Status:** Accepted (owner decision, 2026-08-06). Refines ADR 0001.

## Context

ADR 0001 confines Pence multiplication and division to `packages/entitlements/src/money.ts`, but says nothing about display formatting. In that vacuum, six call sites grew that divide Pence by 100 to interpolate £ figures into explanation strings (`engine/funding.ts`, both tax-free-childcare modules, both universal-credit modules), in two mutually inconsistent hand-rolled formats, none tested. The 2026-08 revisit audit also found the money rule's detection grep in `docs/ai/rules.md` matched none of them, so the boundary was documentation-only.

## Decision

Engine output carries money as raw `Pence` values in structured fields. No £-formatted string is composed inside `packages/entitlements`: explanation and signpost lines that need to reference an amount expose it as a typed field, and `apps/web` interpolates it through its existing `pounds()` formatter. One formatter, one place, one rendering of every amount a user sees.

Enforcement is mechanical, not prose: a type-aware ESLint rule bans arithmetic on Pence-typed values outside `money.ts`, replacing the dead grep (a name-based grep tripwire remains in `docs/ai/rules.md` as a quick check, but the lint rule is the gate, since the audit showed one violating site used variables without a Pence suffix).

## Alternatives rejected

- A sanctioned `formatPounds()` beside `money.ts`: smallest diff, but keeps the engine in the display business and leaves two formatters to hold consistent.
- Blessing the status quo with dedupe and string tests: would make engine-side formatting permanent policy rather than an accident.

## Consequences

The explanation-line schemas change (message templates gain typed amount fields), some copy moves toward the web layer, and string tests assert the exact rendered form of at least one amount ≥ £1,000. Implementation is the Phase 1.5 money-boundary task; this ADR records the shape so the task cannot re-litigate it.
