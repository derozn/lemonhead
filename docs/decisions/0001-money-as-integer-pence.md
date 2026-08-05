# ADR 0001: Money is a branded integer number of pence

**Status:** Accepted. **Date:** 2026-08-05.

## Context

Every monetary figure in Lemonhead is computed deterministically (NFR4). Representing pounds as decimal floats invites the classic 0.1 + 0.2 problem, and the obvious industry reflex is a decimal library (bignumber.js, decimal.js, dinero.js).

## Decision

Money is `Pence`, a Zod-branded integer, rejected at the boundary if fractional. All arithmetic is native integer arithmetic. Multiplication and division happen only in `packages/entitlements/src/money.ts`, whose helpers do integer-multiply-then-divide with exactly one round-half-up per operation, implemented once in `proRata`. Quantities that money is multiplied by (days, quarter-hour steps) are dyadic rationals, so products are exact in doubles before the single rounding.

No decimal library. Integer arithmetic in doubles is exact to 2^53 − 1, roughly £90 trillion, about twelve orders of magnitude above a worst-case projection. A library would still need the same domain policy functions written on top of it, so it changes the primitive without removing any wheel, while costing a dependency, boxed objects that break the branded-number ergonomics, and JSON friction.

## Exit criteria (owner-agreed)

Adopt dinero.js when either fires: the money helper surface grows past a handful of functions or call sites start needing multiply-before-divide folklore to be correct; or a true allocation problem appears (splitting a top-down total across periods without losing pennies). Today's engine computes bottom-up, so allocation does not arise.

## Consequences

Rounding is explicit, tested, and happens once per line item; property tests assert lines sum exactly to totals. The interview answer to "why no money library" is this document.
