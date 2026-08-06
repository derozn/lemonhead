---
name: plan-gate
description: Pre-implementation confidence gate. Use inside /task before writing code, or standalone before any non-trivial change. Scores five weighted checks and stops low-confidence work before it wastes a diff.
---

# /plan-gate — score before you build

Spend a little context here to avoid a wrong-direction diff. Score each check 0 to 1, multiply by its weight, sum, and act on the total. Show the table; no silent gating.

| Check                           | Weight | What a 1.0 looks like                                                                                                                      |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Duplicate implementation search | 0.25   | Grepped `packages/*` and `apps/*` exports and helpers; nothing existing does this job (or the task is to change the existing thing, named) |
| Boundary and purity compliance  | 0.25   | The planned diff respects package boundaries, engine purity, money-in-money.ts, memory-only UC figures; named which rules apply            |
| Spec/design alignment           | 0.20   | Cites the spec section, design doc section, or task id this implements; no invented requirements                                           |
| External facts verified         | 0.20   | Rule-touching: gov.uk citation in hand (via /verify-rule). Library-API-touching: context7 checked. Neither applies: full marks             |
| Root cause, not symptom         | 0.10   | For fixes: the cause is identified (via /troubleshoot if needed), not patched around                                                       |

**Thresholds:** total ≥ 0.90 → proceed. 0.70–0.89 → present the gap rows to the owner and wait. < 0.70 → stop; research the weak rows; rescore. Never proceed by rounding up.

Output: the scored table, the total, and one sentence per sub-1.0 row saying what would raise it.
