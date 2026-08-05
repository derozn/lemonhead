# ADR 0005: Zod schemas are the single source of truth for types

**Status:** Accepted. **Date:** 2026-08-05.

## Context

NFR6 requires strict TypeScript with no `any` and schema-first design. The same shapes must validate user input now and LLM tool output in Phase 3.

## Decision

Every domain type is `z.infer` of a Zod schema in `packages/schemas`. Branded primitives (`Pence`, `IsoMonth`, `IsoDate`, `AgeBandId`, `SessionId`) make unit and id mixups type errors. States that interact are discriminated unions, so illegal combinations are unrepresentable: a UC claimant household without its figures cannot exist as a parsed value. Cross-references inside a `FeeSchedule` (prices to bands and sessions, funding restrictions to sessions) are validated at parse time, so a parsed schedule is internally consistent before the engine sees it.

## Consequences

The engine can be defensive-free about data shape and referential integrity, which keeps its 100% branch coverage honest. In Phase 3 the same schemas emit JSON Schema for tool-enforced extraction, closing the loop the spec designed for.
