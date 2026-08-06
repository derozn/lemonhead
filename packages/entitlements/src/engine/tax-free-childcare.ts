import { Pence } from '@lemonhead/schemas';
import type { FamilyProfile } from '@lemonhead/schemas';

import { assessTaxFreeChildcare } from '../eligibility/tax-free-childcare.ts';
import { applyPercent, negate, sumPence } from '../money.ts';
import type { TaxFreeChildcareParams } from '../rules/types.ts';

import type { GrossLine, MonthlyGross } from './gross.ts';
import type { TimelineMonth } from './timeline.ts';

/**
 * Apply the Tax-Free Childcare top-up (design doc §4.3 step 5): 20% of each
 * eligible child's out-of-pocket costs, capped per quarter per child (£500,
 * or £1,000 for a disabled child). The cap is applied per calendar quarter
 * of the horizon, an approximation of the real entitlement periods that run
 * from account opening; the approximation is stated on every line. UC
 * households never reach here as eligible (mutual exclusivity is enforced by
 * the eligibility assessor).
 */
export function applyTfc(
  profile: FamilyProfile,
  params: TaxFreeChildcareParams,
  timeline: TimelineMonth[],
  months: MonthlyGross[],
): MonthlyGross[] {
  const [tfcSource] = params.sources;
  /** childIndex → quarter key → top-up already used, in pence. */
  const usedByQuarter = new Map<string, Pence>();

  return months.map((month, monthIndex) => {
    const timelineMonth = timeline[monthIndex];
    if (!timelineMonth) {
      throw new RangeError('applyTfc needs months aligned with the timeline');
    }
    const tfcLines: GrossLine[] = [];

    for (const childMonth of timelineMonth.children) {
      const childCost = sumPence(
        month.lines
          .filter((line) => line.childIndex === childMonth.childIndex && !line.excludedFromTotal)
          .map((line) => line.amountPence),
      );
      if (childCost <= 0) continue;

      const assessment = assessTaxFreeChildcare(profile, childMonth.child, params, month.month);
      if (assessment.result.status === 'ineligible') continue;
      if (assessment.result.status === 'needs-info') {
        const reasonAmounts: Record<string, Pence> = {};
        for (const reason of assessment.result.reasons) {
          Object.assign(reasonAmounts, reason.amounts);
        }
        tfcLines.push({
          kind: 'tfc-top-up',
          childIndex: childMonth.childIndex,
          amountPence: Pence.parse(0),
          description: 'Tax-Free Childcare top-up unconfirmed',
          sessionId: undefined,
          ageBandId: undefined,
          excludedFromTotal: false,
          citation: tfcSource,
          assumptions: assessment.result.reasons.map((reason) => reason.message),
          amounts: Object.keys(reasonAmounts).length > 0 ? reasonAmounts : undefined,
        });
        continue;
      }

      const quarterKey = `${String(childMonth.childIndex)}:${month.month.slice(0, 4)}q${String(Math.floor((Number(month.month.slice(5, 7)) - 1) / 3))}`;
      const used = usedByQuarter.get(quarterKey) ?? Pence.parse(0);
      const remaining = sumPence([assessment.quarterlyCapPence, negate(used)]);
      const topUp = Math.min(applyPercent(childCost, 20), remaining);
      if (topUp <= 0) continue;
      usedByQuarter.set(quarterKey, sumPence([used, topUp]));

      tfcLines.push({
        kind: 'tfc-top-up',
        childIndex: childMonth.childIndex,
        amountPence: negate(Pence.parse(topUp)),
        description:
          'Tax-Free Childcare top-up: {topUp} added for every {payIn} you pay in, up to {quarterlyCap} every 3 months for this child',
        sessionId: undefined,
        ageBandId: undefined,
        excludedFromTotal: false,
        citation: tfcSource,
        assumptions: [
          'Assumes these costs are paid through a Tax-Free Childcare account. The quarterly cap is applied per calendar quarter, an approximation of your entitlement periods, which run from when the account was opened.',
        ],
        amounts: {
          topUp: params.topUp.governmentAddsPence,
          payIn: params.topUp.parentPaysPence,
          quarterlyCap: assessment.quarterlyCapPence,
        },
      });
    }

    const lines = [...month.lines, ...tfcLines];
    const totalPence = sumPence(
      lines.filter((line) => !line.excludedFromTotal).map((line) => line.amountPence),
    );
    return { month: month.month, lines, totalPence };
  });
}
