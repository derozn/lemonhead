import { ageInMonths } from '@lemonhead/schemas';
import type { Child, FamilyProfile, IsoMonth, NonNegativePence } from '@lemonhead/schemas';

import type { TaxFreeChildcareParams } from '../rules/types.ts';

import type { EligibilityReason, EligibilityResult } from './types.ts';

export interface TfcAssessment {
  result: EligibilityResult;
  /** The cap that applies to this child (higher when disabled). */
  quarterlyCapPence: NonNegativePence;
}

/**
 * Assess Tax-Free Childcare for one child as of `atMonth`.
 *
 * The age test is "11 or younger (16 or younger if disabled)" per gov.uk; the
 * exact in-year cutoff date is not stated on the overview page, so the test
 * here is by age in whole years. Nursery-age children are a decade from this
 * edge, so the approximation is harmless and documented.
 */
export function assessTaxFreeChildcare(
  profile: FamilyProfile,
  child: Child,
  params: TaxFreeChildcareParams,
  atMonth: IsoMonth,
): TfcAssessment {
  const [tfcSource, exclusivitySource, earningsSource] = params.sources;
  const quarterlyCapPence = child.disabled
    ? params.disabledQuarterlyCapPence
    : params.quarterlyCapPence;
  const blockers: EligibilityReason[] = [];
  const unknowns: EligibilityReason[] = [];

  if (profile.universalCredit.receives) {
    blockers.push({
      message:
        'Tax-Free Childcare cannot be combined with Universal Credit; the schemes are mutually exclusive.',
      ...(exclusivitySource ? { citation: exclusivitySource } : {}),
    });
  }

  const maxYears = child.disabled ? params.maxAgeYears.disabled : params.maxAgeYears.standard;
  if (ageInMonths(child.dobMonth, atMonth) >= (maxYears + 1) * 12) {
    blockers.push({
      message: `This child is over the Tax-Free Childcare age limit (${String(maxYears)} or younger${child.disabled ? ', as a disabled child' : ''}).`,
      ...(tfcSource ? { citation: tfcSource } : {}),
    });
  }

  if (profile.parents.allMeetMinimumEarnings === 'no') {
    blockers.push({
      message:
        'At least one parent earns below the Tax-Free Childcare minimum (the equivalent of 16 hours a week at minimum wage over 3 months).',
      ...(earningsSource ? { citation: earningsSource } : {}),
    });
  } else if (profile.parents.allMeetMinimumEarnings === 'unsure') {
    unknowns.push({
      message:
        'Whether every parent meets the minimum-earnings test is not known; Tax-Free Childcare is shown as unconfirmed.',
      ...(earningsSource ? { citation: earningsSource } : {}),
    });
  }

  if (profile.parents.anyOver100k === 'yes') {
    blockers.push({
      message:
        'A parent expects adjusted net income over £100,000 this tax year, which ends Tax-Free Childcare eligibility.',
      ...(earningsSource ? { citation: earningsSource } : {}),
    });
  } else if (profile.parents.anyOver100k === 'unsure') {
    unknowns.push({
      message:
        'Whether any parent is over the £100,000 adjusted net income ceiling is not known; Tax-Free Childcare is shown as unconfirmed.',
      ...(earningsSource ? { citation: earningsSource } : {}),
    });
  }

  if (blockers.length > 0) {
    return { result: { status: 'ineligible', reasons: blockers }, quarterlyCapPence };
  }
  if (unknowns.length > 0) {
    return { result: { status: 'needs-info', reasons: unknowns }, quarterlyCapPence };
  }
  return {
    result: {
      status: 'eligible',
      reasons: [
        {
          message: `For every £8 you pay in, the government adds £2, up to £${String(quarterlyCapPence / 100)} every 3 months for this child.`,
          ...(tfcSource ? { citation: tfcSource } : {}),
        },
      ],
    },
    quarterlyCapPence,
  };
}
