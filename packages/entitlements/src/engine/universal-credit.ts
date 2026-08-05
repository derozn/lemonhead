import { Pence } from '@lemonhead/schemas';
import type { FamilyProfile } from '@lemonhead/schemas';

import { assessUcChildcare } from '../eligibility/universal-credit.ts';
import { applyPercent, negate, sumPence } from '../money.ts';
import type { UniversalCreditParams } from '../rules/types.ts';

import type { GrossLine, MonthlyGross } from './gross.ts';

/**
 * Apply the Universal Credit childcare element (design doc §4.3 step 6, spec
 * §3 as amended): full modelling for current claimants, a signpost for
 * everyone else. For a claimant with a positive award the element passes
 * through one-for-one (the 55% taper depends on earnings, not the maximum
 * amount), so it is computed exactly; a £0 award means the taper may bite
 * and the engine says so rather than guessing. The benefit-cap exemption is
 * computed from stated net earnings against the £881/month threshold.
 */
export function applyUc(
  profile: FamilyProfile,
  params: UniversalCreditParams,
  months: MonthlyGross[],
): MonthlyGross[] {
  const assessment = assessUcChildcare(profile, params);
  const [guidanceSource] = params.sources;

  const signpostOnly = (description: string, assumptions: string[]): MonthlyGross[] =>
    months.map((month, monthIndex) => {
      if (monthIndex > 0) return month;
      const line: GrossLine = {
        kind: 'uc-signpost',
        childIndex: undefined,
        amountPence: Pence.parse(0),
        description,
        sessionId: undefined,
        ageBandId: undefined,
        excludedFromTotal: false,
        citation: guidanceSource,
        assumptions,
      };
      return { ...month, lines: [...month.lines, line] };
    });

  if (!profile.universalCredit.receives || assessment.result.status !== 'eligible') {
    return signpostOnly(
      assessment.result.status === 'needs-info'
        ? 'Universal Credit childcare element unconfirmed'
        : 'Universal Credit childcare element not applied',
      assessment.result.reasons.map((reason) => reason.message),
    );
  }

  const { netMonthlyEarnings, currentMonthlyAward } = profile.universalCredit;
  if (currentMonthlyAward === 0) {
    return signpostOnly('Universal Credit childcare element not computed', [
      'Your current award is £0, so the earnings taper may absorb some or all of the childcare element. Report your childcare costs to UC and check your statement rather than relying on an estimate here.',
    ]);
  }

  const capExempt = netMonthlyEarnings >= params.benefitCap.earningsExemptionMonthlyNetPence;

  return months.map((month) => {
    if (month.totalPence <= 0) return month;
    const element = Math.min(
      applyPercent(month.totalPence, params.childcare.percentCovered),
      assessment.monthlyCapPence,
    );
    const line: GrossLine = {
      kind: 'uc-element',
      childIndex: undefined,
      amountPence: negate(Pence.parse(element)),
      description: `Universal Credit childcare element: ${String(params.childcare.percentCovered)}% of your childcare costs, up to £${(assessment.monthlyCapPence / 100).toFixed(2)} a month`,
      sessionId: undefined,
      ageBandId: undefined,
      excludedFromTotal: false,
      citation: guidanceSource,
      assumptions: capExempt
        ? [
            'You pay the nursery first and UC reimburses you the following assessment period; the monthly figure here assumes steady reporting.',
          ]
        : [
            'You pay the nursery first and UC reimburses you the following assessment period; the monthly figure here assumes steady reporting.',
            `Your stated earnings are below the £${(params.benefitCap.earningsExemptionMonthlyNetPence / 100).toFixed(2)}/month benefit-cap exemption threshold, so the benefit cap may reduce this amount. Check your UC statement.`,
          ],
    };
    const lines = [...month.lines, line];
    return {
      month: month.month,
      lines,
      totalPence: sumPence(lines.filter((l) => !l.excludedFromTotal).map((l) => l.amountPence)),
    };
  });
}
