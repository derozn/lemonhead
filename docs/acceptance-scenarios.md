# Acceptance scenarios

Hand-worked family/nursery cases with the arithmetic shown, encoded as regression tests in `packages/entitlements/src/engine/acceptance.test.ts`. Every figure here was computed by hand first and the engine is required to match it to the penny. Amounts are pence unless written with a £ sign. All scenarios run with `asOfDate` 2026-08-05, so the horizon is 2026-08 through 2027-07, and the rule set is `england/funded-hours@2026-04-06+tfc@2026-04-06+uc@2026-04-06`.

## A. Fully funded working family (Sunny Bank)

One child born 2024-11, 3 term-time days of 10h. Attended hours: 10 × 3 × 38 = 1,140 a year, exactly the 30-hour entitlement, so the whole fee is funded.

- Gross: Babies £78.00/day: 7800 × 3 × 38 ÷ 12 = 74100; Toddlers from 2026-11: 68400. Registration 5000 in month 1; deposit 20000 shown, excluded.
- Funding: deduction equals the fee; consumables £9.50/day: 2850 × 38 ÷ 12 = 9025.
- TFC: 20% of the remaining cost: month 1: 20% × 14025 = 2805; other months 20% × 9025 = 1805.
- Nets: month 1: 79100 − 74100 + 9025 − 2805 = **11220**; months 2–12: **7220**.
- Annual: gross 79100 + 2 × 74100 + 9 × 68400 = **842900**; net 11220 + 11 × 7220 = **90640**; deductions **752260**.

## B. Capped funding at an hourly nursery (Little Acorns)

One child born 2024-01, 2 days of 8h, term time. The nursery accepts at most 15 funded hours a week.

- Gross: 850 × 16h × 38 ÷ 12 = 43067 (Under 3s); 790 × 16 × 38 ÷ 12 = 40027 (Over 3s, from 2027-01). Lunch £4/day: 2533.
- Funding: attended 608 h/year; funded min(1140, 608, 15 × 38 = 570) = 570. Deduction 43067 × 2280 ÷ 2432 = 40375, then 40027 × 2280 ÷ 2432 = 37525.
- After funding: 43067 − 40375 + 2533 = 5225; from January 40027 − 37525 + 2533 = 5035.
- TFC: 20%: 1045, then 1007.
- Nets: months 1–5: **4180**; months 6–12: **4028**. Annual net **49096**; annual gross 5 × 45600 + 7 × 297920 ÷ 7 = **525920**.

## C. Funded-rate deduction on a stretched year (The Orchard)

One child born 2024-06, 5 days of 10h, term time (the nursery's stretched offer is term-time-only for funding, so this family books term time). Deduction at the stated £5.70/h, not the headline rate.

- Gross: Twos 6400 × 5 × 38 ÷ 12 = 101333; Preschool from 2027-06: 6100 × 5 × 38 ÷ 12 = 96583. Weekly consumables 2750 × 38 ÷ 12 = 8708.
- Funding: attended 1,900 h/year; funded 1,140. Deduction 570 × 1140 ÷ 12 = 54150 (both bands).
- After funding: 101333 − 54150 + 8708 = 55891; from June 96583 − 54150 + 8708 = 51141.
- TFC 20%: 11178, then 10228.
- Nets: months 1–10: **44713**; months 11–12: **40913**. Annual net **528956**.

## D. The November-birthday transition, universal offer only (Sunny Bank)

One child born 2023-11, 3 days of 10h term time; parents fail the minimum-earnings test, so only the universal 15 hours apply, from the term after the third birthday: 1 January 2027. TFC is also blocked by the earnings test.

- Months 1–3: Toddlers 68400 (+5000 registration in month 1 = **73400**, then **68400**).
- Months 4–5: Preschool 6900 × 3 × 38 ÷ 12 = **65550**, unfunded.
- Months 6–12: universal 570 of 1,140 hours: 65550 × 2280 ÷ 4560 = 32775 off, consumables 9025 on: **41800**.
- Annual net 73400 + 2 × 68400 + 2 × 65550 + 7 × 41800 = **633900**.

## E. Funding withheld when consumables exceed the saving (The Orchard)

One child born 2023-03 attending 1 day of 4h. Funding would save 570 × 152h ÷ 12 = 7220 a month; weekly consumables would add 8708. The engine withholds funding, states both figures, and the month stays at the gross 3355 × 38 ÷ 12 = **10624** before TFC. (Found by the property suite; pinned in the funding tests.)

## F. Universal Credit household, two children (Sunny Bank)

Single working parent on UC (net earnings £1,450, current award £896), children born 2023-03 (5 × 8h) and 2025-09 (2 × 6h), both stretched all-year (51 billing weeks). TFC is excluded by UC.

- Gross: child 1 Preschool, covering full-day: 6900 × 5 × 51 ÷ 12 = 146625; child 2 Babies: 7800 × 2 × 51 ÷ 12 = 66300; 10% oldest-child discount −14663; registrations 2 × 5000 in month 1. Month 1 gross **208262**, later **198262**.
- Funding: child 1: 1,140 of 2,040 hours: 146625 × 4560 ÷ 8160 = 81938 off, consumables 20188 on. Child 2 starts the term after reaching 9 months: 1 September 2026; from then all 612 attended hours funded: 66300 off, consumables 8075 on.
- After funding: month 1: 146512; months 2–12: 78287.
- UC element (85%, two-child cap 183616, award > 0, cap-exempt at £1,450 ≥ £881): month 1: 124535; later 66544.
- Nets: month 1: **21977**; months 2–12: **11743**. Annual net **151150**; annual gross **2389144**.

## G. Claimant with a £0 award (signpost, not a number)

As F but `currentMonthlyAward: 0`: the taper may absorb the element, so the engine emits a signpost telling the family to report costs to UC and check their statement, and computes nothing. Covered in the scheme tests.

## H. Unknown funding policy (flag, never guess)

Any eligible family at a nursery whose funding policy is `unknown`: fees are shown unfunded with a flagged note naming what to add. Covered in the funding tests.
