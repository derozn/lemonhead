# ADR 0006: Universal Credit modelled fully for current claimants only

**Status:** Accepted (owner decision, 2026-08-05, twice against the assistant's recommendation). **Date:** 2026-08-05.

## Context

The spec originally allowed signpost-only UC in v1. The owner chose full award modelling because the families UC serves arguably need this tool most. But a complete would-be entitlement calculation needs the housing element, which means Local Housing Allowance tables for every rental market area in England, updated annually, plus disability elements and transitional protection: a benefits calculator swallowing a childcare tool.

## Decision

Full modelling for current claimants: the childcare element computed exactly (85% up to the caps), a zero-floor check against the claimant's stated current award and net earnings with the 55% taper, and a benefit-cap exemption check computed from net earnings against the £881/month threshold. Non-claimants get an eligibility check and a signpost to a full benefits calculator; would-be entitlement is out of scope.

The mechanics favour claimants: for a household with a positive award that is cap-exempt, the childcare element passes through one-for-one, so the claimant path is exact without any LHA machinery.

## Consequences

Two questionnaire changes fell out of encoding: `allInPaidWork` was added (the element's actual work test) and the benefit-cap question was deleted because the exemption tests net earnings already collected. FR2 and NFR5 were amended (2026-08-05) to permit collecting net earnings and the current award, client-side only.
