# Phase 1 Design: Schemas, Entitlements Engine, Manual-Entry Calculator

**Status:** Reviewed with owner 2026-08-05; all open decisions resolved (spec §11 items 2–9). No code exists yet.
**Scope:** Spec §8 Phase 1 only. `packages/schemas`, `packages/entitlements`, and a web app with manual fee entry producing an itemised, explainable cost projection. No AI, no pipeline service, no eval harness in this phase.
**Date:** 2026-08-05

---

## 1. What Phase 1 ships

A parent can type in a nursery's prices by hand, answer the family questionnaire, and get a monthly and annual cost projection with every line item traceable to either a fee they entered or a named government rule with a gov.uk citation. It works without an account and persists in localStorage. It is a useful calculator on its own, which is the spec's bar for the phase.

Deliberately absent: uploads, extraction, comparison view (spec assigns comparison UI to Phase 4), accounts, the Hono service, telemetry. The calculation engine is pure TypeScript and runs wherever it is imported, so Phase 1 needs no API layer at all.

## 2. Package boundaries

```
packages/schemas         Zod schemas and inferred types. Zero business logic.
packages/entitlements    Pure functions + versioned rule data. Depends only on schemas.
apps/web                 Next.js App Router. Depends on schemas + entitlements.
```

Dependency rule, enforced by convention now and lint later: `schemas` imports nothing from the workspace, `entitlements` imports only `schemas`, `apps/web` imports both. Nothing in `entitlements` touches IO, dates from the system clock, or randomness. The caller supplies `asOfDate`. This is what makes the engine trivially testable and reproducible.

### Why no `apps/pipeline` yet

The spec's package layout includes it, but Phase 1 has nothing async to run. Standing up Hono now would be scaffolding for its own sake. It arrives in Phase 3 when there is a pipeline to host. Simplest deployable thing wins.

## 3. Key types (`packages/schemas`)

Zod is the single source of truth. Every type below is `z.infer` of a schema. No `any`, no casts.

### 3.1 Primitives

- **`Pence`**: money is a branded integer number of pence (`z.number().int().brand<'Pence'>()`). All arithmetic happens in pence. Formatting to pounds is a UI concern. Floating-point money is banned outright. (ADR-001.)
- **`IsoMonth`**: `YYYY-MM` string. Child DOBs are month-precision per NFR5 (no full birth dates held).
- **`AgeInMonths`**: derived, never stored.
- **`Jurisdiction`**: literal `'england'` for now, an enum so Scotland/Wales/NI can be added without reshaping anything. England-only v1 is confirmed (spec §11.6); the UI states the limit plainly.

### 3.2 `FeeSchedule`

Designed once, for both manual entry and (later) extraction. Manual entry fills a subset; the schema makes "not stated" explicit rather than defaulting, because a silent default becomes a silent wrong number.

```
FeeSchedule
  nursery: { name, postcodeArea?, sourceNote }        // sourceNote: 'manual-entry' | doc ref later
  ageBands: AgeBand[]                                  // nursery-defined, months-based, validated non-overlapping
  prices: PriceEntry[]                                 // { ageBandId, session, rate: Pence }
  sessions: SessionDef[]                               // { id, kind: 'full-day'|'half-day'|'hourly'|'weekly', hours }
  discounts: SiblingDiscount[]                         // percentage, which child it applies to
  extras: Extra[]                                      // registration fee, deposit, per-session consumables…
  fundingPolicy: FundingPolicy                         // discriminated union, see below
  attendancePatterns: ('term-time-38' | 'stretched-all-year')[]   // what the nursery offers
```

`FundingPolicy` is the schema's most important discriminated union, because it is where real nurseries diverge (spec §3):

```
| { kind: 'hours-deduction' }                          // funded hours off the bill at headline rate
| { kind: 'funded-rate-deduction', fundedRate: Pence } // deducts at a rate below headline
| { kind: 'sessions-allocated', ... }                  // funding consumed as whole sessions
| { kind: 'not-offered' }
| { kind: 'unknown' }                                  // manual entry may honestly not know
plus, on any offering variant:
  consumablesCharge?: { amount: Pence, per: 'day'|'week'|'funded-hour' }
  conditions?: {                                       // nursery-imposed conditions on accepting funding
    minDaysPerWeek?: number                            // e.g. funding only applied from 3 days/week
    maxFundedHoursPerWeek?: number                     // e.g. accepts only 15 of the 30 hours
    termTimeOnly?: boolean                             // funding not applied to stretched patterns
    restrictedToSessions?: SessionId[]                 // funding only on named sessions/days
    conditionsUnknown?: boolean                        // stated policy not known; flag, don't guess
  }
```

Funding conditions are checked against the family's attendance in the engine's funding step. An unmet condition produces an itemised, explainable "funding not applied" line naming the rule (e.g. minimum three days per week), never a silently missing deduction. (Added 2026-08-05 at owner's request.)

`'unknown'` produces a projection with that line flagged and a range shown, never a guessed number.

### 3.3 `FamilyProfile`

```
FamilyProfile
  children: Child[]                                    // array from day one; sibling discounts and
                                                       // per-child caps make single-child-only schemas a trap
  Child: { dobMonth: IsoMonth, disabled: boolean, attendance: { daysPerWeek, hoursPerDay, pattern } }
  parents: { count: 1|2, allInPaidWork: YesNoUnsure,  // paid-work test for the UC childcare element
             allMeetMinimumEarnings: YesNoUnsure, anyOver100k: YesNoUnsure }
  universalCredit:                                     // discriminated union (as built, task 2):
    | { receives: false }                              // a claimant household without its figures
    | { receives: true,                                //   is unrepresentable, per NFR6
        netMonthlyEarnings: Pence                      // held in memory, never persisted (NFR5 amendment)
        currentMonthlyAward: Pence }                   // from the claimant's UC statement
  // Benefit-cap exemption is computed from netMonthlyEarnings against the
  // £881/month net threshold (gov.uk), so it is never asked (as built, task 4).
  jurisdiction: Jurisdiction
```

Eligibility inputs for funded hours and TFC are the coarse facts those schemes actually test (minimum-earnings test, £100k cliff), asked as questions a tired parent can answer, with `unsure` producing a signposted range rather than a refusal. Exact figures appear only on the UC path, via progressive disclosure: the money fields exist only on the claimant branch of the union, are asked only of households that say they receive UC, are processed entirely client-side, and live in memory only. On reload they are re-asked; the rest of the profile persists.

### 3.4 `CostProjection`

The engine's output, built for FR6 explainability:

```
CostProjection
  ruleSetId, calculatedAt (asOfDate), horizon: IsoMonth[]
  months: MonthProjection[]                            // 12 entries
  MonthProjection: { month, lines: Line[], netTotal: Pence }
  Line: discriminated union on kind:
    'gross-fees' | 'funded-hours-deduction' | 'consumables-charge' |
    'sibling-discount' | 'extra' | 'tfc-top-up' | 'uc-signpost' | 'unknown-flag'
  every Line carries: amount: Pence, source: SourceRef
  SourceRef: { type: 'fee-schedule', path } | { type: 'rule', ruleId, citationUrl, retrievedOn }
  annual: { gross, deductions, net }
  eligibility: per-scheme EligibilityResult ('eligible' | 'ineligible' | 'needs-info', reasons + citations)
```

Two totalling rules, fixed now so itemisation always reconciles: each line is rounded to whole pence when produced, and every total is the sum of its displayed lines. A projection whose lines don't add up to its total is a bug by definition, and there is a property test saying so.

## 4. The entitlements engine (`packages/entitlements`)

### 4.1 Rule-module versioning

Rules change on a per-scheme cadence (funded hours moved in Sept 2025, UC caps move each April, NMW-linked earnings thresholds move each April). One monolithic dated rule set would force a new version whenever any scheme twitches. So versioning is per scheme:

```
src/rules/
  funded-hours/
    logic.ts                       // pure functions over a FundedHoursParams object
    params/2025-09-01.england.ts   // the parameter values, with gov.uk citations + retrieval date
  tax-free-childcare/
    logic.ts
    params/2025-04-06.uk.ts
  universal-credit/
    logic.ts
    params/2026-04-06.uk.ts
  registry.ts                      // resolveRuleSet(asOfDate, jurisdiction) → composite RuleSet
```

Each params file is data only: numbers, dates, and a `sources` array of `{ url, quote, retrievedOn }`. Logic consumes params and never hardcodes a figure. A rates change in April 2027 means one new params file and zero logic edits. `resolveRuleSet` picks, per scheme, the latest params effective on or before `asOfDate`, and stamps the composite with an id like `england/fh@2025-09-01+tfc@2025-04-06+uc@2026-04-06`. That id lands in every `CostProjection`, so any historical projection can be recomputed exactly. (ADR-002.)

### 4.2 Verified parameter values (gov.uk, retrieved 2026-08-05)

These go into the initial params files, each with its citation:

| Parameter                                                                | Value                                                                                | Source                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Working-parent funded hours                                              | 30 h/week × 38 weeks, ages 9 months to school age                                    | gov.uk/free-childcare-if-working                         |
| Minimum earnings (per parent, per quarter)                               | £2,643.68 (21+); £2,256.80 (18–20); £1,664 (under 18/apprentice)                     | same                                                     |
| Income ceiling                                                           | £100,000 adjusted net income per parent, cliff edge                                  | same                                                     |
| Universal 3–4-year-old entitlement                                       | 15 h/week × 38 weeks, no work test                                                   | gov.uk early education pages, to re-verify when encoding |
| TFC top-up                                                               | £2 per £8 paid in; cap £500/quarter (£2,000/yr), £1,000/quarter (£4,000/yr) disabled | gov.uk/tax-free-childcare                                |
| TFC child age limit                                                      | 11 or younger; 16 if disabled                                                        | same                                                     |
| UC childcare element                                                     | 85% of costs, max £1,071.09/month (one child), £1,836.16 (two+), from 6 Apr 2026     | gov.uk/guidance/universal-credit-childcare-costs         |
| UC ↔ TFC                                                                 | Mutually exclusive                                                                   | same                                                     |
| UC taper rate, work allowances, benefit-cap earnings-exemption threshold | to verify at encoding                                                                | gov.uk UC guidance                                       |

Anything marked "to re-verify" gets a fresh gov.uk check at encoding time, per the spec's standing instruction. Third-party figures are never citation sources. (One third-party result in today's research gave a wrong TFC age limit, which is the cautionary tale in miniature.)

### 4.3 Engine shape

One public entry point:

```ts
calculateProjection(feeSchedule, familyProfile, { asOfDate, ruleSetId? }): CostProjection
```

Internally a pipeline of pure steps, each unit-testable alone:

1. **Timeline**: build the 12-month horizon; for each month, each child's age in months and applicable nursery age band.
2. **Eligibility**: per scheme, per child: eligible / ineligible / needs-info, with reasons. Includes the term-start rule (working-parent entitlement begins the term after the qualifying birthday; terms start 1 Sep / 1 Jan / 1 Apr).
3. **Gross fees**: attendance pattern × sessions × rates, sibling discounts, recurring extras. One-off extras (registration fee) appear in month 1 and in the annual total, itemised separately so monthly comparison stays fair.
4. **Funding application**: funded hours applied per the nursery's `FundingPolicy`, including consumables charges and the stretched-offer conversion (1,140 annual hours spread over the attended weeks) when the pattern is all-year. Nursery funding conditions (minimum days per week, capped funded hours, term-time-only, session restrictions) are evaluated against the family's attendance first; an unmet condition yields an explainable no-funding line.
5. **TFC top-up**: 20% of the eligible out-of-pocket remainder, capped per calendar quarter of the horizon. Skipped entirely when `receivesUniversalCredit`, with an explanatory line citing the exclusivity rule.
6. **UC**: full modelling for current claimants (spec §3 as amended). The childcare element is computed exactly (85% of eligible costs up to the caps), then two checks against the claimant's stated figures: a zero-floor check (does the current award plus element stay above zero once the 55% earnings taper is accounted for) and a benefit-cap exemption check. The mechanics work in the claimant's favour: for anyone with a positive award who is cap-exempt, the element passes through 1:1, and the projection shows it as a real reduction line. Non-claimants get an eligibility check and a cited signpost line to a full benefits calculator; would-be entitlement is out of scope (no Local Housing Allowance modelling).
7. **Assemble**: months, annual totals, per-line `SourceRef`s.

The projection is month-aware rather than a static snapshot: a child turning 3 in November, or crossing into entitlement the term after turning 9 months, changes the numbers mid-horizon, and that change is precisely the thing parents cannot compute themselves. This is one of two places Phase 1 chooses the less simple design on purpose (the other is full UC claimant modelling). The static version would be simpler and materially misleading. Confirmed by the owner 2026-08-05 (spec §11.7); recorded as ADR-003.

### 4.4 What the engine refuses to do

The engine reads no clock and performs no IO. It does not guess either: `FundingPolicy: 'unknown'` and `YesNoUnsure: 'unsure'` propagate as flagged lines or ranges rather than silently assumed values. This is the deterministic-core discipline the whole portfolio narrative rests on, established before any LLM is in the building.

## 5. Web app (Phase 1 slice)

Next.js App Router, strict TS. Three screens: fee entry (schema-driven form building a `FeeSchedule`), family questionnaire (`FamilyProfile`), projection view (itemised lines, each expandable to show its `SourceRef`, gov.uk links rendered for rule-sourced lines). Fee entry captures the nursery's full price list (spec §11.8), stepped band-by-band with skip actions for sessions the nursery doesn't offer, so completeness doesn't cost usability. State in localStorage keyed by nursery, except the `ucDetails` money fields, which never leave memory. Brand per spec §1.3: Lemonhead name and strapline, lemon-yellow primary, one citrus metaphor per surface at most. Deployed to a password-protected Vercel preview only, since the trademark gate has not cleared.

## 6. Test strategy

- **Runner:** Vitest everywhere. Coverage thresholds set to 100% lines/branches for `packages/entitlements` in CI, per spec §3. `schemas` and `web` are tested but not held to 100%.
- **Unit tests:** every rule module gets scenario tables. Eligibility edge cases from spec §3 each get a named test: income floor, £100k cliff (one parent over, both just under), UC/TFC exclusivity, term-boundary starts, age-band transitions mid-horizon.
- **Property-based tests (fast-check):** net ≤ gross; net monotonic non-decreasing in hours booked; TFC top-up never exceeds its quarterly cap; funded deduction never exceeds gross fees for the funded child; every month's lines sum exactly to its total; same inputs + same `ruleSetId` → identical output.
- **Acceptance scenarios:** five to eight fully hand-computed family/nursery cases in `docs/acceptance-scenarios.md`, worked in prose with arithmetic shown, cross-checked against gov.uk's childcare costs calculator where it overlaps. These are the audit trail an interviewer can follow, and they double as regression fixtures.
- **Schema tests:** fixture `FeeSchedule`s for three realistic nurseries (per-day pricer, per-hour pricer, funded-rate-deduction pricer) parse and round-trip.
- **Web:** RTL smoke tests for form → projection; MSW not needed until Phase 3.

CI (GitHub Actions) runs typecheck, lint, and tests on every PR from task 1 onward.

## 7. ADRs to be written during this phase

ADR-001 money as branded integer pence. ADR-002 per-scheme dated rule params with composite rule-set ids. ADR-003 month-aware projection horizon. ADR-004 England-only v1 with jurisdiction enum. ADR-005 Zod as single source of truth for types. ADR-006 UC modelled fully for current claimants only, signpost for non-claimants. ADR-007 financial figures held in memory, never persisted. All confirmed with the owner 2026-08-05.
