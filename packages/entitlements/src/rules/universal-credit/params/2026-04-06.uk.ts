import { isoDate, NonNegativePence } from '@lemonhead/schemas';

import type { UniversalCreditParams } from '../../types.ts';

const p = (value: number) => NonNegativePence.parse(value);

/**
 * Universal Credit parameters effective 6 April 2026, verified against the
 * cited sources on 2026-08-05. The childcare caps and work allowances come
 * from the official DWP benefit and pension rates document for 2026/27.
 */
export const universalCredit2026April: UniversalCreditParams = {
  effectiveFrom: isoDate('2026-04-06'),
  childcare: {
    percentCovered: 85,
    monthlyCapOneChildPence: p(107109),
    monthlyCapTwoPlusChildrenPence: p(183616),
  },
  taperPercent: 55,
  workAllowanceMonthly: {
    noHousingPence: p(71000),
    withHousingPence: p(42700),
  },
  benefitCap: {
    earningsExemptionMonthlyNetPence: p(88100),
    monthlyWithChildrenOutsideLondonPence: p(183500),
    monthlyWithChildrenLondonPence: p(211025),
  },
  sources: [
    {
      url: 'https://www.gov.uk/guidance/universal-credit-childcare-costs',
      quote:
        'Up to 85% of childcare costs; from 6 April 2026 the maximum is £1,071.09 a month for one child and £1,836.16 for two or more children. You must be in paid work (no minimum hours); if you have a partner, both of you normally need to be in paid work.',
      retrievedOn: '2026-08-05',
    },
    {
      url: 'https://assets.publishing.service.gov.uk/media/69931706ceeaa48d377f6bd5/Benefit-and-pension-rates-2026-2027.pdf',
      quote:
        'Childcare costs amount: maximum for one child 1071.09, two or more children 1836.16. Work allowances 2026/27: higher (no housing amount) 710.00, lower 427.00. Taper rate 55%.',
      retrievedOn: '2026-08-05',
    },
    {
      url: 'https://www.gov.uk/benefit-cap/when-youre-not-affected',
      quote:
        'You and your partner earn £881 or more a month combined, after tax and National Insurance contributions.',
      retrievedOn: '2026-08-05',
    },
    {
      url: 'https://www.gov.uk/benefit-cap/benefit-cap-amounts',
      quote:
        'Couples and single parents with children: £1,835 a month outside Greater London, £2,110.25 inside Greater London.',
      retrievedOn: '2026-08-05',
    },
  ],
};
