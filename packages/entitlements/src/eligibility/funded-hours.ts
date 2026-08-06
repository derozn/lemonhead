import { addMonths } from '@lemonhead/schemas';
import type { Child, FamilyProfile, IsoMonth } from '@lemonhead/schemas';

import { firstTermStartAfter } from '../rules/term-dates.ts';
import type { FundedHoursParams } from '../rules/types.ts';

import type { EligibilityReason, EligibilityResult } from './types.ts';

export type FundedHoursScheme = 'working-parent' | 'universal-3-to-4';

export interface FundedHoursAssessment {
  scheme: FundedHoursScheme;
  result: EligibilityResult;
  hoursPerWeek: number;
  weeksPerYear: number;
  /** First month with funded hours: the term after the qualifying birthday. */
  startMonth: IsoMonth;
}

/** Both schemes, structurally present so callers never re-find them. */
export interface FundedHoursAssessments {
  workingParent: FundedHoursAssessment;
  universal: FundedHoursAssessment;
}

function resolveStatus(
  blockers: EligibilityReason[],
  unknowns: EligibilityReason[],
): EligibilityResult['status'] {
  if (blockers.length > 0) return 'ineligible';
  if (unknowns.length > 0) return 'needs-info';
  return 'eligible';
}

/**
 * Assess one child's funded-hours entitlements: the working-parent offer and
 * the universal 3–4-year-old offer. Both can apply; the engine's funding step
 * uses whichever is in force in a given month (the working-parent 30 hours
 * subsumes the universal 15 when both are active). The benefits-linked offer
 * for 2-year-olds is signposted at projection level, not assessed here.
 */
export function assessFundedHours(
  profile: FamilyProfile,
  child: Child,
  params: FundedHoursParams,
): FundedHoursAssessments {
  const [eligibilitySource] = params.sources;
  const blockers: EligibilityReason[] = [];
  const unknowns: EligibilityReason[] = [];

  if (profile.parents.allMeetMinimumEarnings === 'no') {
    blockers.push({
      message:
        'At least one parent earns below the minimum for the working-parent offer (the equivalent of 16 hours a week at minimum wage over 3 months).',
      ...(eligibilitySource ? { citation: eligibilitySource } : {}),
    });
  } else if (profile.parents.allMeetMinimumEarnings === 'unsure') {
    unknowns.push({
      message:
        'Whether every parent meets the minimum-earnings test is not known; the working-parent offer is shown as unconfirmed.',
      ...(eligibilitySource ? { citation: eligibilitySource } : {}),
    });
  }

  if (profile.parents.anyOver100k === 'yes') {
    blockers.push({
      message:
        'A parent expects adjusted net income over {incomeCeiling} this tax year, which ends working-parent eligibility (a cliff edge, tested per parent).',
      amounts: { incomeCeiling: params.workingParent.maxAdjustedNetIncomePerParentPence },
      ...(eligibilitySource ? { citation: eligibilitySource } : {}),
    });
  } else if (profile.parents.anyOver100k === 'unsure') {
    unknowns.push({
      message:
        'Whether any parent is over the {incomeCeiling} adjusted net income ceiling is not known; the working-parent offer is shown as unconfirmed.',
      amounts: { incomeCeiling: params.workingParent.maxAdjustedNetIncomePerParentPence },
      ...(eligibilitySource ? { citation: eligibilitySource } : {}),
    });
  }

  const workingParentStatus = resolveStatus(blockers, unknowns);
  const workingParentReasons: EligibilityReason[] =
    workingParentStatus === 'eligible'
      ? [
          {
            message: `Eligible for ${String(params.workingParent.hoursPerWeek)} funded hours a week over ${String(params.workingParent.weeksPerYear)} weeks, from the term after your child turns ${String(params.workingParent.minAgeMonths)} months.`,
            ...(eligibilitySource ? { citation: eligibilitySource } : {}),
          },
          {
            message:
              'Assumes eligible immigration status with access to public funds; this is signposted, not checked here.',
          },
        ]
      : [...blockers, ...unknowns];

  const universalSource = params.sources.at(-1);
  return {
    workingParent: {
      scheme: 'working-parent',
      result: { status: workingParentStatus, reasons: workingParentReasons },
      hoursPerWeek: params.workingParent.hoursPerWeek,
      weeksPerYear: params.workingParent.weeksPerYear,
      startMonth: firstTermStartAfter(
        addMonths(child.dobMonth, params.workingParent.minAgeMonths),
        params.termStartMonths,
      ),
    },
    universal: {
      scheme: 'universal-3-to-4',
      result: {
        status: 'eligible',
        reasons: [
          {
            message: `All children get ${String(params.universalThreeToFour.hoursPerWeek)} funded hours a week over ${String(params.universalThreeToFour.weeksPerYear)} weeks from the term after their third birthday, with no work or income test.`,
            ...(universalSource ? { citation: universalSource } : {}),
          },
        ],
      },
      hoursPerWeek: params.universalThreeToFour.hoursPerWeek,
      weeksPerYear: params.universalThreeToFour.weeksPerYear,
      startMonth: firstTermStartAfter(
        addMonths(child.dobMonth, params.universalThreeToFour.minAgeMonths),
        params.termStartMonths,
      ),
    },
  };
}
