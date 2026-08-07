import { isoDate, NonNegativePence } from '@lemonhead/schemas';

import type { UniversalCreditParams } from '../../types.ts';

const p = (value: number) => NonNegativePence.parse(value);

/**
 * Universal Credit parameters effective 6 April 2026, verified against the
 * cited sources on 2026-08-05. The childcare caps and work allowances come
 * from the official DWP benefit and pension rates document for 2026/27.
 * Quotes made verbatim and re-verified 2026-08-06; the taper rate is cited
 * to the UC wages guidance page because the annual rates document does not
 * state it (the taper is set by regulation, not the uprating statement).
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
        'You can get up to 85% of childcare costs paid back to you. … From 6 April, the maximum amount you can receive for childcare costs increased to £1,071.09 for one child, and £1,836.16 for 2 or more children. … It does not matter how many hours you work – there is no minimum. … If you live with a partner, you both need to be in paid work, unless your partner cannot look after your children.',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://assets.publishing.service.gov.uk/media/69931706ceeaa48d377f6bd5/Benefit-and-pension-rates-2026-2027.pdf',
      quote:
        'Childcare costs amount / Maximum for one child 1031.88 1071.09 / Maximum for two or more children 1768.94 1836.16 … Work allowances / Higher work allowance (no housing amount) / One or more dependent children or limited capability for work 684.00 710.00 / Lower work allowance / One or more dependent children or limited capability for work 411.00 427.00',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/universal-credit/how-your-wages-affect-your-payments',
      quote: 'For every £1 you earn from working, your Universal Credit payment goes down by 55p.',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/benefit-cap/when-youre-not-affected',
      quote:
        'get Universal Credit and you and your partner earn £881 or more a month combined, after tax and National Insurance contributions',
      retrievedOn: '2026-08-06',
    },
    {
      url: 'https://www.gov.uk/benefit-cap/benefit-cap-amounts',
      quote:
        "Benefit cap outside Greater London: If you're in a couple £1,835 per month; If you're a single parent and your children live with you £1,835 per month. … Benefit cap inside Greater London: If you're in a couple £2,110.25 per month; If you're a single parent and your children live with you £2,110.25 per month.",
      retrievedOn: '2026-08-06',
    },
  ],
};
