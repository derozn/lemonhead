import { isoMonth } from '@lemonhead/schemas';
import type { Child, FamilyProfile, YesNoUnsure } from '@lemonhead/schemas';
import { ucHouseholdTwoChildren, workingFamilyOneChild } from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { taxFreeChildcare2026April } from '../rules/tax-free-childcare/params/2026-04-06.uk.ts';

import { assessTaxFreeChildcare } from './tax-free-childcare.ts';

const params = taxFreeChildcare2026April;
const AT = isoMonth('2026-08');

function firstChild(profile: FamilyProfile): Child {
  const [head] = profile.children;
  if (!head) throw new Error('fixture has no children');
  return head;
}

const child = firstChild(workingFamilyOneChild);

function withParents(overrides: Partial<FamilyProfile['parents']>): FamilyProfile {
  return {
    ...workingFamilyOneChild,
    parents: { ...workingFamilyOneChild.parents, ...overrides },
  };
}

describe('assessTaxFreeChildcare', () => {
  it('is eligible for the working fixture family with the standard cap', () => {
    const assessment = assessTaxFreeChildcare(workingFamilyOneChild, child, params, AT);
    expect(assessment.result.status).toBe('eligible');
    expect(assessment.quarterlyCapPence).toBe(50000);
    expect(assessment.result.reasons[0]?.message).toContain(
      'For every {payIn} you pay in, the government adds {topUp}',
    );
    expect(assessment.result.reasons[0]?.amounts).toEqual({
      payIn: 800,
      topUp: 200,
      quarterlyCap: 50000,
    });
    expect(assessment.result.reasons[0]?.citation?.url).toContain('gov.uk');
  });

  it('is blocked outright for UC households (mutual exclusivity)', () => {
    const disabledChild = ucHouseholdTwoChildren.children[1];
    if (!disabledChild) throw new Error('fixture child missing');
    const assessment = assessTaxFreeChildcare(ucHouseholdTwoChildren, disabledChild, params, AT);
    expect(assessment.result.status).toBe('ineligible');
    expect(assessment.result.reasons[0]?.message).toContain('mutually exclusive');
    expect(assessment.quarterlyCapPence).toBe(100000);
  });

  it('applies the higher cap for disabled children', () => {
    const assessment = assessTaxFreeChildcare(
      workingFamilyOneChild,
      { ...child, disabled: true },
      params,
      AT,
    );
    expect(assessment.result.status).toBe('eligible');
    expect(assessment.quarterlyCapPence).toBe(100000);
  });

  it('blocks a child over 11 (standard) but not a disabled child under 17', () => {
    const twelveYearOld = { ...child, dobMonth: isoMonth('2014-01') };
    const blocked = assessTaxFreeChildcare(workingFamilyOneChild, twelveYearOld, params, AT);
    expect(blocked.result.status).toBe('ineligible');
    expect(blocked.result.reasons[0]?.message).toContain('age limit');

    const disabledSixteen = { ...child, dobMonth: isoMonth('2010-01'), disabled: true };
    expect(
      assessTaxFreeChildcare(workingFamilyOneChild, disabledSixteen, params, AT).result.status,
    ).toBe('eligible');

    const disabledSeventeen = { ...child, dobMonth: isoMonth('2009-01'), disabled: true };
    const blockedDisabled = assessTaxFreeChildcare(
      workingFamilyOneChild,
      disabledSeventeen,
      params,
      AT,
    );
    expect(blockedDisabled.result.status).toBe('ineligible');
    expect(blockedDisabled.result.reasons[0]?.message).toContain('as a disabled child');
  });

  it.each<[YesNoUnsure, YesNoUnsure, string]>([
    ['no', 'no', 'ineligible'],
    ['unsure', 'no', 'needs-info'],
    ['yes', 'yes', 'ineligible'],
    ['yes', 'unsure', 'needs-info'],
  ])('earnings=%s, over100k=%s → %s', (allMeetMinimumEarnings, anyOver100k, expected) => {
    const assessment = assessTaxFreeChildcare(
      withParents({ allMeetMinimumEarnings, anyOver100k }),
      child,
      params,
      AT,
    );
    expect(assessment.result.status).toBe(expected);
  });

  it('still assesses correctly when a params set carries no citations', () => {
    const bare = { ...params, sources: [] };
    for (const profile of [
      workingFamilyOneChild,
      ucHouseholdTwoChildren,
      withParents({ allMeetMinimumEarnings: 'no', anyOver100k: 'yes' }),
      withParents({ allMeetMinimumEarnings: 'unsure', anyOver100k: 'unsure' }),
    ]) {
      const target = profile.children[0];
      if (!target) throw new Error('fixture child missing');
      const assessment = assessTaxFreeChildcare(profile, target, bare, AT);
      for (const reason of assessment.result.reasons) {
        expect(reason.citation).toBeUndefined();
      }
    }
    const overAge = assessTaxFreeChildcare(
      workingFamilyOneChild,
      { ...child, dobMonth: isoMonth('2014-01') },
      bare,
      AT,
    );
    expect(overAge.result.status).toBe('ineligible');
    for (const reason of overAge.result.reasons) {
      expect(reason.citation).toBeUndefined();
    }
  });
});
