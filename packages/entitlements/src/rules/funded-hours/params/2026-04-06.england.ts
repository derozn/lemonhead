import { isoDate, NonNegativePence } from '@lemonhead/schemas';

import type { FundedHoursParams } from '../../types.ts';

const p = (value: number) => NonNegativePence.parse(value);

/**
 * England funded-hours parameters, current from 6 April 2026 (the NMW-linked
 * earnings thresholds moved that day; the 30-hour expansion itself completed
 * 1 September 2025). All figures verified against the cited sources on
 * 2026-08-05.
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
        '30 hours per week of free childcare for 38 weeks of the year, for children aged 9 months to 4 years old. Earnings thresholds over 3 months: £2,643.68 (over 21), £2,256.80 (18 to 20), £1,664 (under 18 or apprentice). Not eligible if expected adjusted net income is over £100,000 for the current tax year.',
      retrievedOn: '2026-08-05',
    },
    {
      url: 'https://www.gov.uk/free-childcare-if-working/what-youll-get',
      quote:
        'You may be able to get free childcare for more than 38 weeks a year if you take fewer hours over more weeks.',
      retrievedOn: '2026-08-05',
    },
    {
      url: 'https://assets.publishing.service.gov.uk/media/683981d4c99c4f37ab4e86e3/September_2025_early_education_and_childcare_entitlements_expansion_-_local_authority_system_guidance_May_2025.pdf',
      quote:
        'Universal entitlement for 3-4 year olds: 15 hours per week for 38 weeks of the year, no work-related requirements, from the term after a child turns three. Disadvantaged 2-year-olds: 15 hours per week for 38 weeks. Entitlements begin the term after the child’s birthday; terms start 1 September, 1 January and 1 April.',
      retrievedOn: '2026-08-05',
    },
  ],
};
