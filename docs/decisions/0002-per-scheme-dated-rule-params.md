# ADR 0002: Per-scheme dated rule parameters with a composite rule-set id

**Status:** Accepted. **Date:** 2026-08-05.

## Context

UK childcare funding rules change on different cadences per scheme: the funded-hours expansion completed September 2025, UC caps and work allowances move each 6 April, NMW-linked earnings thresholds move each April. One monolithic dated rule set would need a new version whenever any scheme twitches.

## Decision

Each scheme (funded hours, Tax-Free Childcare, Universal Credit) has its own dated params files containing only data: figures plus citations with URL, exact quote, and retrieval date. Logic consumes params and never hardcodes a figure. `resolveRuleSet(asOfDate)` picks the latest in-force params per scheme, stamps a composite id (`england/funded-hours@2026-04-06+tfc@2026-04-06+uc@2026-04-06`) into every projection, and refuses dates before the earliest encoded params rather than approximating.

## Consequences

A rates change is one new file and zero logic edits. Any historical projection can be recomputed against exactly the parameters that produced it. Every figure is verified against gov.uk at encoding time (spec §3 forbids trusting training data), and the citation lives next to the number it justifies.
