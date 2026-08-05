# Spec: Lemonhead — AI-Powered UK Childcare Cost Calculator

**Status:** Draft v1.1 — for agent implementation
**Owner:** Nick
**Type:** Portfolio / revenue side project
**Workflow:** Requirements → Design → Planning → Implementation → Verification → Review (follow phases in order; do not begin Implementation until Planning output is approved by the owner)

---

## 1. Purpose & Strategic Context

Build and ship a public web product that embeds AI as a core capability — not a chatbot bolt-on — to serve as demonstrable proof of production LLM engineering for job applications.

### 1.1 Target audience for the portfolio narrative

The finished project must speak directly to the hiring signals of these companies:

| Company                                    | What they do                                                  | What this project must demonstrate to them                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Incard** (priority — active application) | Fintech "financial OS" for digital businesses                 | Money-adjacent AI where wrong numbers are unacceptable: validation, guardrails, deterministic calculation separated from LLM inference |
| **Starling Bank**                          | UK challenger bank                                            | Production reliability: failure UX, human-review fallbacks, observability, cost discipline                                             |
| **Yapily**                                 | Open banking infrastructure                                   | API-first design, clean service boundaries, typed contracts, infrastructure thinking                                                   |
| **Orbital (Orbital Witness)**              | AI legaltech — document extraction for property due diligence | The direct parallel: messy real-world document ingestion → structured extraction → confidence scoring → human-in-the-loop review       |
| **Further (FundOS)**                       | Fund administration software                                  | Document-heavy back-office automation with auditability                                                                                |

Every architectural decision should be defensible in an interview at any of these companies. The write-up (§10) is a first-class deliverable, not an afterthought.

### 1.2 The product problem

UK parents face genuinely complex childcare cost decisions:

- Nursery fee sheets are inconsistent, messy PDFs (per-day vs per-session vs per-hour pricing, sibling discounts, registration fees, consumables charges, funded vs unfunded rates)
- Government support schemes interact in non-obvious ways: funded hours entitlements, Tax-Free Childcare, Universal Credit childcare element
- No existing tool combines _a specific nursery's actual prices_ with _a family's actual entitlements_ into a real monthly cost projection

**Core value proposition:** upload a nursery's fee sheet → answer a few questions about your family → get an accurate monthly/annual cost projection with entitlements applied, comparable across nurseries.

### 1.3 Brand identity

- **Name:** **Lemonhead** — named after the owner's son's nickname. This origin story is part of the brand: it appears on the About page and in the portfolio write-up ("he's the reason I know what nurseries cost"). Do not invent an alternative etymology.
- **Strapline:** _"Childcare costs, freshly squeezed."_
- **Descriptive subline (hero / app store):** _"Upload any nursery's fee sheet. Lemonhead reads it, applies your funded hours and tax-free childcare, and shows what you'll really pay."_
- **Visual direction:** bright lemon-yellow primary; lemon as app icon/logo mark (option: abacus beads styled as lemon pips as a secondary motif). Warm and parent-friendly, not corporate fintech blue.
- **Voice:** squeeze/citrus metaphors are available but rationed — one per surface, never stacked. Empathetic to tired parents; numbers-first; no hype. Avoid "a lemon = a dud" framing anywhere near money copy.
- **Naming in code:** product name in UI copy and marketing surfaces only. Packages keep functional names (`entitlements`, `extraction`, etc.); the deployed app/repo may be `lemonhead`.
- **⚠️ Pre-launch gate:** UK trademark clearance (classes 9/36/42 — note the US "Lemonheads" confectionery mark and The Lemonheads band) and domain acquisition must complete before public launch. Build under the name; do not publish under it until cleared.

---

## 2. Requirements

### 2.1 Functional requirements

**FR1 — Fee sheet ingestion.** Users upload a nursery fee sheet (PDF or image). System extracts a normalised fee schedule: age bands, session types, rates, discounts, extras, funded-hours handling policy.

**FR2 — Entitlement questionnaire.** Short structured form: child DOB, parental working status, household income band (for scheme eligibility thresholds), desired days/hours per week, term-time vs all-year. _(Amended 2026-08-05, owner decision.)_ Households that receive Universal Credit are additionally asked for net monthly earnings and their current monthly award (read from their UC statement) so the childcare element can be computed exactly. These figures are processed client-side only, held in browser memory, and never transmitted or written to storage.

**FR3 — Cost projection.** Deterministic calculation engine combines the extracted fee schedule with entitlement rules to produce monthly and annual cost projections, itemised (gross fees, funded hours deduction, Tax-Free Childcare top-up, net cost).

**FR4 — Comparison.** Users can hold multiple extracted nurseries and compare projections side by side.

**FR5 — Confidence & review.** Every extraction carries field-level confidence. Low-confidence fields are visually flagged and user-editable before calculation. Users can correct any extracted value; corrections are captured as labelled data (with consent) for the eval set.

**FR6 — Explainability.** Every number in the projection links to its source: either a region of the uploaded document (extraction) or a named rule with a citation to the relevant gov.uk guidance (calculation).

### 2.2 Non-functional requirements

- **NFR1:** Extraction accuracy ≥ 90% field-level on the golden eval set before public launch (measured, not vibes)
- **NFR2:** p95 end-to-end extraction latency ≤ 30s with streaming progress UI
- **NFR3:** Cost per document extraction tracked per-request; target ≤ £0.05 average via model routing
- **NFR4:** Zero LLM arithmetic — all money calculations are deterministic TypeScript, unit-tested
- **NFR5:** GDPR-conscious: uploaded documents deletable by user, no PII required beyond DOB month/year, clear retention policy. _(Amended 2026-08-05.)_ One exception: the Universal Credit path collects net earnings and the current award. Those figures stay in browser memory only, are never transmitted to any server, and are never persisted, not even to localStorage.
- **NFR6:** Strict TypeScript throughout — no `any`, schema-first with Zod, exhaustive discriminated unions for pipeline states

### 2.3 Non-goals (v1)

- No nursery directory / search (users bring their own fee sheets)
- No accounts required for single-nursery use (localStorage; accounts only for saved comparisons)
- No childminder/nanny cost modelling (nursery fee sheets only)
- No mobile app
- No fine-tuning — this is a prompt + eval + routing engineering story, not a training story

---

## 3. Domain Rules (Calculation Engine)

⚠️ **Agent instruction:** UK childcare funding rules change frequently (major expansion phases through 2024–2025; rates and thresholds update each April/September). Before implementing, **verify current rules against gov.uk** ("Check you're eligible for free childcare if you're working", "Tax-Free Childcare", "Universal Credit childcare costs"). Encode rules as versioned, dated rule modules so historical projections remain reproducible. Do not trust training data for thresholds, hours, or rates.

The engine must model at minimum:

- **Funded hours entitlements** for working parents by child age band, including the 38-week term-time basis and "stretched" offers, and the fact that nurseries apply funding differently (some deduct hours, some deduct a funded rate lower than their headline rate, many add consumables/meals charges to funded sessions — the extraction schema must capture the nursery's stated policy)
- **Tax-Free Childcare** (20% top-up, per-child caps, eligibility thresholds, mutual exclusivity with Universal Credit)
- **Universal Credit childcare element** (percentage reclaim up to monthly caps). _(Resolved 2026-08-05.)_ v1 models the full award effect for current claimants: the element at 85% up to the caps, a zero-floor check against the claimant's stated current award and net earnings, and a benefit-cap exemption check. Non-claimants get an eligibility check and a signpost to a full benefits calculator; the tool does not compute would-be entitlement (no Local Housing Allowance modelling).
- Eligibility edge cases: income floor (16 hrs × NMW equivalent), upper income cutoff per parent, immigration status caveat (signpost, don't model)

Rules live in `packages/entitlements` as pure functions: `(FeeSchedule, FamilyProfile, RuleSetVersion) → CostProjection`. 100% unit test coverage on this package. Property-based tests for invariants (net cost ≤ gross cost; projections monotonic in hours booked; etc.).

---

## 4. AI Pipeline Architecture

### 4.1 Pipeline stages

```
Upload → Preprocess → Triage → Extract → Validate/Repair → Confidence Gate → (Auto-accept | User review) → FeeSchedule
```

1. **Preprocess:** PDF → page images + text layer (if present). Detect scanned vs digital.
2. **Triage (cheap model, e.g. Haiku-class):** Is this a nursery fee sheet? Which pages contain pricing? Single- or multi-site? Route non-fee-sheets to a friendly rejection. Output: routing decision + page selection.
3. **Extract (capable model, e.g. Sonnet-class, vision):** Selected pages → structured `FeeSchedule` via tool-enforced structured output against a Zod-derived JSON schema. Prompt includes few-shot examples of gnarly real formats.
4. **Validate/Repair:** Zod parse. On failure, one repair loop: feed validation errors back to the model with the original output. On second failure → dead-letter queue + user-facing graceful degradation (manual entry form pre-filled with whatever parsed).
5. **Cross-checks (deterministic):** sanity rules — hourly rate within plausible bounds (£3–£20), daily rate ≈ hourly × session length ± tolerance, age bands non-overlapping. Violations lower field confidence.
6. **Confidence gate:** model self-reported confidence × cross-check results → per-field score. Below threshold → field flagged for user review (FR5). Never silently guess.

### 4.2 Model routing & cost control

- Triage on the cheapest viable model; extraction on a mid-tier model; escalate to the top-tier model **only** when: repair loop failed, confidence below threshold, or document flagged complex (multi-site, tables spanning pages)
- Prompt caching for the static system prompt + few-shot examples
- Per-request token accounting recorded to the observability layer; cost per document is a first-class product metric with a dashboard

### 4.3 Tool use

The extraction model gets **read-only tools**, not licence to compute:

- `lookup_age_band(dob_range)` — canonical age band normalisation
- `report_field(field, value, confidence, source_bbox)` — extraction is emitted via tool calls with document coordinates, enabling FR6 explainability (click a number → highlight the source region)

All arithmetic happens in `packages/entitlements`. If the model needs a derived number, it doesn't get one — the pipeline computes it downstream.

### 4.4 Failure UX

Every pipeline state has a designed user experience: not-a-fee-sheet, partial extraction, low confidence, timeout, over-budget document (page cap). Manual entry is always available as a parallel path — AI accelerates, never gates.

---

## 5. Eval Harness (first-class deliverable)

This is the centrepiece of the portfolio narrative. Build it **before** iterating on prompts.

- **Golden set:** 40–60 real UK nursery fee sheets (collected from public nursery websites), each with hand-labelled ground-truth `FeeSchedule` JSON. Versioned in-repo (or LFS). Stratified: digital PDFs, scans, image-heavy brochures, multi-site chains, single-page price lists.
- **Metrics:** field-level precision/recall, exact-match rate per field type (rates vs discounts vs policies), calibration curve (does 80% confidence mean 80% accuracy?), cost per doc, p50/p95 latency.
- **Runner:** `pnpm eval` executes the full pipeline against the golden set, writes a scored JSON report + markdown summary, and diffs against the previous baseline. Fails CI if accuracy regresses > 2 points or cost regresses > 20%.
- **Experiment log:** every prompt/model/routing change gets an entry: hypothesis → eval delta → decision. This log is interview gold.
- **Feedback loop:** user corrections (FR5, with consent) flow into a candidate pool for expanding the golden set.

---

## 6. Observability

- OpenTelemetry traces across the pipeline: one trace per document, spans per stage, attributes for model, tokens in/out, cost, confidence, repair-loop count
- Metrics: extraction success rate, escalation rate, dead-letter rate, cost per doc, latency percentiles
- Local dev: OTel → Grafana stack (LGTM docker-compose) — mirrors production-grade practice without SaaS spend
- A public "engineering stats" page on the site itself (aggregate accuracy, average cost per extraction, docs processed) — turns the observability work into a visible portfolio feature

---

## 7. Tech Stack

| Layer                | Choice                                                                                                                                       | Rationale                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Monorepo             | pnpm workspaces                                                                                                                              | Owner's standard                                                        |
| Web app              | Next.js (App Router), strict TS                                                                                                              | Owner's core stack; SSR + streaming UI                                  |
| API/pipeline service | Hono                                                                                                                                         | Lightweight, owner-preferred; clean separation of pipeline from web app |
| Schemas              | Zod (shared package, single source of truth → TS types + JSON schema for model tools)                                                        | NFR6                                                                    |
| LLM                  | Anthropic API (vision + tool use + structured outputs), model routing per §4.2                                                               |                                                                         |
| Queue/state          | Lightweight job queue (BullMQ + Redis, or DB-backed if simpler) — pipeline is async with streamed progress via SSE                           | NFR2                                                                    |
| Storage              | Postgres (Neon/Supabase) + object storage for documents with TTL deletion                                                                    | NFR5                                                                    |
| Testing              | Vitest + RTL + MSW; property-based tests (fast-check) for entitlements                                                                       | Owner's standard                                                        |
| Eval                 | Custom runner in `packages/evals` (no heavyweight framework — keep it inspectable)                                                           | §5                                                                      |
| Hosting              | Vercel (web) + small container/Fly.io (pipeline) or single-host to start — **bias to the simplest deployable thing**; document the trade-off | Owner values pragmatism                                                 |

**Package layout:**

```
apps/web                  # Next.js UI
apps/pipeline             # Hono service: upload, triage, extract, repair
packages/schemas          # Zod: FeeSchedule, FamilyProfile, CostProjection, pipeline states
packages/entitlements     # Pure, versioned rule modules + calculation engine
packages/extraction       # Prompts, few-shots, routing logic, repair loop
packages/evals            # Golden set, runner, reports
packages/telemetry        # OTel setup shared across apps
```

---

## 8. Implementation Plan (phased — each phase ends shippable)

**Phase 1 — Deterministic core (no AI):** `packages/schemas` + `packages/entitlements` with full test coverage; web app with _manual_ fee entry → projection with itemised, explainable output. _Ships as a useful calculator on its own._

**Phase 2 — Eval scaffolding:** collect + label golden set; build eval runner against a stub extractor. Baseline: 0%.

**Phase 3 — Extraction pipeline:** preprocess → triage → extract → validate/repair; wire evals; iterate prompts/routing until NFR1 met on held-out split. Experiment log from day one.

**Phase 4 — Product integration:** upload flow, streaming progress, confidence-flagged review UI, source-region highlighting, comparison view.

**Phase 5 — Observability + hardening:** OTel, cost dashboard, dead-letter handling, rate limiting, document TTL deletion, public stats page.

**Phase 6 — Write-up & launch:** blog-style engineering post (§10), README, demo video, deploy publicly.

Agent should produce a task breakdown per phase for owner approval before writing code (per owner's spec-driven workflow).

---

## 9. Success Criteria

- Publicly deployed URL usable by a real parent end-to-end
- ≥ 90% field-level extraction accuracy on held-out eval split, with the accuracy/cost journey documented (e.g. "71% → 93% across N experiments while reducing cost per doc X%")
- Zero LLM-computed monetary figures (auditable by code inspection)
- CI runs unit tests + eval regression gate
- Write-up published; project referenced in applications to Incard, Starling, Yapily, Orbital, Further

## 10. Write-up requirements

A single long-form engineering post covering: the problem; why LLM extraction + deterministic calculation is the right split; pipeline architecture diagram; eval methodology and the experiment log highlights; confidence calibration findings; cost/latency engineering; failure UX decisions; what didn't work. Tone: direct, numbers-first, no hype.

---

## 11. Open Questions (owner to resolve during Requirements review)

1. ~~Product name?~~ **Resolved: Lemonhead** (see §1.3). Remaining: secure domain (lemonhead.app, getlemonhead.co.uk, or similar) and complete the trademark clearance noted in §1.3.
2. ~~Golden-set sourcing~~ **Resolved 2026-08-05: manual collection.** Hand-download fee sheets from public nursery sites, log source URL and retrieval date per document, keep the copyrighted PDFs out of any public repo.
3. ~~Universal Credit modelling~~ **Resolved 2026-08-05: full award modelling for current claimants in v1** (see §3). Non-claimant entitlement stays signpost-only.
4. ~~Accounts/auth~~ **Resolved 2026-08-05: localStorage-only.** Financial figures on the UC path are memory-only (see NFR5).
5. ~~Monetisation experiment~~ **Resolved 2026-08-05: deferred entirely.** Portfolio narrative first; nothing revenue-facing before the trademark gate clears.

Further decisions resolved during design review, 2026-08-05:

6. **Jurisdiction: England-only v1.** The funded-hours rules in §3 are England's; Scotland/Wales/NI are out of scope, stated plainly in the UI. Schemas carry a jurisdiction enum for later expansion.
7. **Projection basis: month-aware over a 12-month horizon.** Age-band changes and term-boundary entitlement starts are computed per month, not snapshotted.
8. **Manual entry captures the nursery's full fee schedule**, not just the bands the horizon needs. Stored nurseries are complete for siblings and later comparison.
9. **FamilyProfile models multiple children from day one**; the UI starts at one child with an add-child action.
