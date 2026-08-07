import { isoDate, NonNegativePence } from '@lemonhead/schemas';

import type { FundedHoursParams } from '../../types.ts';

const p = (value: number) => NonNegativePence.parse(value);

/**
 * England funded-hours parameters, current from 6 April 2026 (the NMW-linked
 * earnings thresholds moved that day; the 30-hour expansion itself completed
 * 1 September 2025). All figures verified against the cited sources on
 * 2026-08-05; quotes made verbatim and re-verified 2026-08-06, adding the two
 * gov.uk pages that state the 38-week basis for the universal and
 * extra-support streams (the DfE PDF only states it for the working-parent
 * stream).
 */
export const fundedHoursEngland2026April: FundedHoursParams = {
  effectiveFrom: isoDate('2026-04-06'),
  jurisdiction: 'england',
  termStartMonths: [1, 4, 9],
  workingParent: {
    hoursPerWeek: 30,
    weeksPerYear: 38,
    minAgeMonths: 9,
    minQuarterlyEarnings: {
      age21AndOverPence: p(264368),
      age18To20Pence: p(225680),
      under18OrApprenticePence: p(166400),
    },
    maxAdjustedNetIncomePerParentPence: p(10000000),
  },
  universalThreeToFour: {
    hoursPerWeek: 15,
    weeksPerYear: 38,
    minAgeMonths: 36,
  },
  disadvantagedTwos: {
    hoursPerWeek: 15,
    weeksPerYear: 38,
    minAgeMonths: 24,
  },
  sources: [
    {
      url: 'https://www.gov.uk/free-childcare-if-working/check-youre-eligible',
      quote:
        "If your child is aged 9 months to 4 years old you can get 30 hours per week of free childcare for 38 weeks of the year. … Over 21 years £2,643.68 … 18 to 20 years £2,256.80 … Under 18 or an apprentice £1,664 … your or your partner's expected adjusted net income (including any foreign income) is over £100,000 for the current tax year",
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/free-childcare-if-working/what-youll-get',
      quote:
        'You may be able to get free childcare for more than 38 weeks a year if you take fewer hours over more weeks.',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://assets.publishing.service.gov.uk/media/683981d4c99c4f37ab4e86e3/September_2025_early_education_and_childcare_entitlements_expansion_-_local_authority_system_guidance_May_2025.pdf',
      quote:
        'All entitlements will continue to work on a termly basis, so children of eligible working parents will be able to receive the entitlement from the termly date (1 September, 1 January, or 1 April) after they reach the relevant age, and the parent has successfully applied. … Universal 15 hours entitlement for all 3- and 4-year-olds … 15 hours of entitlement for families receiving additional support',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/help-with-childcare-costs/free-childcare-and-education-for-3-to-4-year-olds',
      quote:
        "All 3 to 4-year-olds in England can get 570 free hours per year. It's usually taken as 15 hours a week for 38 weeks of the year.",
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/help-with-childcare-costs/free-childcare-2-year-olds-extra-support',
      quote:
        "You'll get these 15 hours for 38 weeks of the year. You may be able to get free childcare for more than 38 weeks a year if you take fewer hours over more weeks.",
      retrievedOn: '2026-08-06',
    },
  ],
};
