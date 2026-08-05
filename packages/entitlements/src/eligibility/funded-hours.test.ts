import type { Child, FamilyProfile, YesNoUnsure } from '@lemonhead/schemas';
import { unsureEligibilityFamily, workingFamilyOneChild } from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { fundedHoursEngland2026April } from '../rules/funded-hours/params/2026-04-06.england.ts';

import { assessFundedHours } from './funded-hours.ts';

const params = fundedHoursEngland2026April;

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

describe('assessFundedHours: working-parent offer', () => {
  it('is eligible for the working fixture family, with citation and immigration caveat', () => {
    const { workingParent } = assessFundedHours(workingFamilyOneChild, child, params);
    expect(workingParent.result.status).toBe('eligible');
    expect(workingParent.hoursPerWeek).toBe(30);
    expect(workingParent.weeksPerYear).toBe(38);
    expect(workingParent.result.reasons[0]?.citation?.url).toContain('gov.uk');
    expect(workingParent.result.reasons[1]?.message).toContain('immigration status');
  });

  it('starts the term after the child turns 9 months (Nov 2024 birth → Sep 2025)', () => {
    expect(assessFundedHours(workingFamilyOneChild, child, params).workingParent.startMonth).toBe(
      '2025-09',
    );
  });

  it.each<[YesNoUnsure, YesNoUnsure, string]>([
    ['no', 'no', 'ineligible'],
    ['unsure', 'no', 'needs-info'],
    ['yes', 'yes', 'ineligible'],
    ['yes', 'unsure', 'needs-info'],
    ['no', 'yes', 'ineligible'],
    ['unsure', 'unsure', 'needs-info'],
  ])('earnings=%s, over100k=%s → %s', (allMeetMinimumEarnings, anyOver100k, expected) => {
    const { workingParent } = assessFundedHours(
      withParents({ allMeetMinimumEarnings, anyOver100k }),
      child,
      params,
    );
    expect(workingParent.result.status).toBe(expected);
  });

  it('an ineligible result names the blocking rule', () => {
    const { workingParent } = assessFundedHours(withParents({ anyOver100k: 'yes' }), child, params);
    expect(workingParent.result.reasons.map((reason) => reason.message).join(' ')).toContain(
      '£100,000',
    );
  });

  it('the unsure fixture family needs info rather than a guess', () => {
    const { workingParent } = assessFundedHours(
      unsureEligibilityFamily,
      firstChild(unsureEligibilityFamily),
      params,
    );
    expect(workingParent.result.status).toBe('needs-info');
  });
});

describe('assessFundedHours: universal 3-to-4 offer', () => {
  it('is always eligible regardless of work or income answers', () => {
    for (const profile of [
      workingFamilyOneChild,
      unsureEligibilityFamily,
      withParents({ allMeetMinimumEarnings: 'no', anyOver100k: 'yes' }),
    ]) {
      const { universal } = assessFundedHours(profile, child, params);
      expect(universal.result.status).toBe('eligible');
      expect(universal.hoursPerWeek).toBe(15);
    }
  });

  it('starts the term after the third birthday (Nov 2024 birth → Jan 2028)', () => {
    expect(assessFundedHours(workingFamilyOneChild, child, params).universal.startMonth).toBe(
      '2028-01',
    );
  });
});

describe('assessFundedHours without sources', () => {
  it('still assesses correctly when a params set carries no citations', () => {
    const bare = { ...params, sources: [] };
    for (const profile of [
      workingFamilyOneChild,
      withParents({ allMeetMinimumEarnings: 'no', anyOver100k: 'yes' }),
      withParents({ allMeetMinimumEarnings: 'unsure', anyOver100k: 'unsure' }),
    ]) {
      const assessments = assessFundedHours(profile, child, bare);
      for (const assessment of [assessments.workingParent, assessments.universal]) {
        for (const reason of assessment.result.reasons) {
          expect(reason.citation).toBeUndefined();
        }
      }
    }
  });
});
