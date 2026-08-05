---
name: verify-rule
description: Verify-then-encode flow for any government rate, threshold, or rule. Use before encoding a new params value, when the rule watcher raises a change, or when a spec question hinges on a current rule. Training data is presumed stale.
---

# /verify-rule — gov.uk first, encode second

No government figure enters the codebase from memory. Ever. (Day one of this project caught a third-party site publishing a wrong TFC age limit; the spec's gov.uk-only rule exists for a reason.)

## Flow

1. **Name the rule precisely** (e.g. "UC childcare element monthly cap, two+ children") and which params file owns it (`packages/entitlements/src/rules/*/params/`).
2. **Launch the policy-analyst agent** to verify: it returns current value(s), effective date, and a citation block (gov.uk URL + exact quote + today's retrieval date). It is advisory-only and cannot write; you encode.
   - Until govuk-mcp is wired: WebFetch on gov.uk (multi-part guides split content across subpages; fetch the specific subpage). After: `mcp__govuk__get_content` (structured parts + change history).
   - PDFs that resist fetching: download and `pdftotext` locally (proven on the DWP rates document).
3. **Compare** against the encoded value. Match → record the fresh retrieval date in the build log and stop. Differ or missing → continue.
4. **Encode as a NEW dated params file** (`YYYY-MM-DD.<jurisdiction>.ts`), never editing an old one — historical projections must recompute exactly (ADR 0002). Citation block in the file. Registry picks it up by effective date.
5. **Tests**: update/extend the scenario tables; the registry test asserting citations-with-retrieval-dates must stay green.
6. **Build-log line**: what changed, effective when, source.

## Boundaries

- The analyst states rules; `packages/entitlements` computes. No arithmetic in this flow beyond reading a number off a page.
- Third-party sites are never citation sources; legislation (via Lex when wired) corroborates but gov.uk/official publications cite.
- If gov.uk is ambiguous, say so and bring the ambiguity to the owner; do not pick an interpretation silently.
