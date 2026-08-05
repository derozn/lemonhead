# ADR 0003: Month-aware projection over a 12-month horizon

**Status:** Accepted (owner decision, 2026-08-05). **Date:** 2026-08-05.

## Context

A static snapshot calculator (price the current month, multiply by twelve) is simpler. But a child turning three in November picks up new rates and funding mid-year, and entitlements start on term boundaries (1 September, 1 January, 1 April, the term after the qualifying birthday). Those transitions are precisely what parents cannot compute themselves.

## Decision

The engine computes each of the next twelve months separately: per-month ages, age-band assignment, and entitlement starts on term boundaries. Headline monthly cost is the annual total divided by twelve, which is how nurseries bill and the only fair comparison basis; band transitions appear as step changes.

## Consequences

This is one of two places Phase 1 deliberately chose the less simple design (the other is ADR 0006), on the grounds that the simple version is materially misleading for any child near a threshold. The timeline builder carries not-born and no-band months as flagged statuses rather than dropping them.
