# ADR 0004: England-only v1 with a jurisdiction enum

**Status:** Accepted (owner decision, 2026-08-05). **Date:** 2026-08-05.

## Context

The spec said "UK" but the funded-hours system it describes is England's. Scotland runs 1,140 universal hours for 3 to 4-year-olds, Wales has its own offer, Northern Ireland has neither. Tax-Free Childcare and Universal Credit are UK-wide.

## Decision

Model England's funded-hours rules only in v1, stated plainly in the UI. Schemas carry a `Jurisdiction` enum (currently one member) so adding nations reshapes nothing. The rule registry gains a per-jurisdiction filter with the first non-England params file.

## Consequences

One verified rule system to encode and test in Phase 1 instead of four. The lint rule that flags a vacuous jurisdiction filter today is documentation that the multi-nation path was considered, not forgotten.
