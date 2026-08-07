import { isoDate, NonNegativePence } from '@lemonhead/schemas';

import type { TaxFreeChildcareParams } from '../../types.ts';

const p = (value: number) => NonNegativePence.parse(value);

/**
 * Tax-Free Childcare parameters, current from 6 April 2026 (the NMW-linked
 * earnings thresholds moved that day; the top-up rate and caps are unchanged
 * since scheme launch). Verified against the cited sources on 2026-08-05;
 * quotes made verbatim and re-verified 2026-08-06. The earnings/income
 * figures are cross-referenced from the funded-hours eligibility page by
 * design (TFC and 30-hours share the qualifying-earnings rules); that page
 * does not itself mention Tax-Free Childcare.
 */
export const taxFreeChildcare2026April: TaxFreeChildcareParams = {
  effectiveFrom: isoDate('2026-04-06'),
  topUp: { parentPaysPence: p(800), governmentAddsPence: p(200) },
  quarterlyCapPence: p(50000),
  disabledQuarterlyCapPence: p(100000),
  maxAgeYears: { standard: 11, disabled: 16 },
  minQuarterlyEarnings: {
    age21AndOverPence: p(264368),
    age18To20Pence: p(225680),
    under18OrApprenticePence: p(166400),
  },
  maxAdjustedNetIncomePerParentPence: p(10000000),
  sources: [
    {
      url: 'https://www.gov.uk/tax-free-childcare',
      quote:
        "For every £8 you pay into the account, the government will top it up by £2. … The total top up you can get for each child is £500 every 3 months (up to £2,000 a year). … This goes up to £1,000 every 3 months if your child is disabled (up to £4,000 a year). … your child must be 11 or younger … (16 or younger if they're disabled)",
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/guidance/universal-credit-childcare-costs',
      quote: 'You cannot get tax-free childcare if you are on Universal Credit.',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/free-childcare-if-working/check-youre-eligible',
      quote:
        "Over 21 years £2,643.68 … 18 to 20 years £2,256.80 … Under 18 or an apprentice £1,664 … your or your partner's expected adjusted net income (including any foreign income) is over £100,000 for the current tax year",
      retrievedOn: '2026-08-06',
    },
  ],
};
