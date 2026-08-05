import type { FamilyProfile, YesNoUnsure } from '@lemonhead/schemas';
import { ucHouseholdTwoChildren, workingFamilyOneChild } from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { universalCredit2026April } from '../rules/universal-credit/params/2026-04-06.uk.ts';

import { assessUcChildcare } from './universal-credit.ts';

const params = universalCredit2026April;

function claimantWithWorkAnswer(allInPaidWork: YesNoUnsure): FamilyProfile {
  return {
    ...ucHouseholdTwoChildren,
    parents: { ...ucHouseholdTwoChildren.parents, allInPaidWork },
  };
}

describe('assessUcChildcare', () => {
  it('is eligible for the working UC fixture household at the two-child cap', () => {
    const assessment = assessUcChildcare(ucHouseholdTwoChildren, params);
    expect(assessment.result.status).toBe('eligible');
    expect(assessment.percentCovered).toBe(85);
    expect(assessment.monthlyCapPence).toBe(183616);
    expect(assessment.result.reasons[0]?.message).toContain('85%');
    expect(assessment.result.reasons[0]?.citation?.url).toContain('gov.uk');
  });

  it('signposts non-claimants instead of computing a would-be award', () => {
    const assessment = assessUcChildcare(workingFamilyOneChild, params);
    expect(assessment.result.status).toBe('ineligible');
    expect(assessment.result.reasons[0]?.message).toContain('benefits calculator');
    expect(assessment.monthlyCapPence).toBe(107109);
  });

  it('requires paid work, signposting the health/caring exemptions', () => {
    const assessment = assessUcChildcare(claimantWithWorkAnswer('no'), params);
    expect(assessment.result.status).toBe('ineligible');
    expect(assessment.result.reasons[0]?.message).toContain('paid work');
  });

  it('reports needs-info when the paid-work answer is unsure', () => {
    expect(assessUcChildcare(claimantWithWorkAnswer('unsure'), params).result.status).toBe(
      'needs-info',
    );
  });

  it('still assesses correctly when a params set carries no citations', () => {
    const bare = { ...params, sources: [] };
    for (const profile of [
      ucHouseholdTwoChildren,
      workingFamilyOneChild,
      claimantWithWorkAnswer('no'),
      claimantWithWorkAnswer('unsure'),
    ]) {
      for (const reason of assessUcChildcare(profile, bare).result.reasons) {
        expect(reason.citation).toBeUndefined();
      }
    }
  });
});
