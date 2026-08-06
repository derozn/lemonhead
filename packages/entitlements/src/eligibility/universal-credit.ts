import type { FamilyProfile, NonNegativePence } from '@lemonhead/schemas';

import type { UniversalCreditParams } from '../rules/types.ts';

import type { EligibilityResult } from './types.ts';

export interface UcChildcareAssessment {
  result: EligibilityResult;
  percentCovered: number;
  /** The monthly cap for this household's child count. */
  monthlyCapPence: NonNegativePence;
}

/**
 * Assess the UC childcare element for the household. Full award modelling for
 * current claimants only (spec §3 as amended); non-claimants get a signpost,
 * never a computed would-be entitlement.
 */
export function assessUcChildcare(
  profile: FamilyProfile,
  params: UniversalCreditParams,
): UcChildcareAssessment {
  const [guidanceSource] = params.sources;
  const monthlyCapPence =
    profile.children.length >= 2
      ? params.childcare.monthlyCapTwoPlusChildrenPence
      : params.childcare.monthlyCapOneChildPence;
  const base = { percentCovered: params.childcare.percentCovered, monthlyCapPence };

  if (!profile.universalCredit.receives) {
    return {
      ...base,
      result: {
        status: 'ineligible',
        reasons: [
          {
            message:
              'This household is not claiming Universal Credit. If you think you might be entitled, use a full benefits calculator (for example via gov.uk) — this tool does not estimate would-be UC awards.',
            ...(guidanceSource ? { citation: guidanceSource } : {}),
          },
        ],
      },
    };
  }

  if (profile.parents.allInPaidWork === 'no') {
    return {
      ...base,
      result: {
        status: 'ineligible',
        reasons: [
          {
            message:
              'The UC childcare element requires the claimant (and any partner) to be in paid work, with no minimum hours. Exemptions exist where a partner cannot provide childcare for health or caring reasons — check with UC directly if that applies.',
            ...(guidanceSource ? { citation: guidanceSource } : {}),
          },
        ],
      },
    };
  }

  if (profile.parents.allInPaidWork === 'unsure') {
    return {
      ...base,
      result: {
        status: 'needs-info',
        reasons: [
          {
            message:
              'Whether all parents are in paid work is not known; the UC childcare element is shown as unconfirmed.',
            ...(guidanceSource ? { citation: guidanceSource } : {}),
          },
        ],
      },
    };
  }

  return {
    ...base,
    result: {
      status: 'eligible',
      reasons: [
        {
          message: `Universal Credit can cover ${String(params.childcare.percentCovered)}% of eligible childcare costs, up to {monthlyCap} a month for this household.`,
          amounts: { monthlyCap: monthlyCapPence },
          ...(guidanceSource ? { citation: guidanceSource } : {}),
        },
      ],
    },
  };
}
