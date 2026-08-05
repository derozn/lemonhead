import { describe, expect, it } from 'vitest';

import { FamilyProfile } from './family-profile.ts';
import {
  ucHouseholdTwoChildren,
  unsureEligibilityFamily,
  workingFamilyOneChild,
} from './fixtures/index.ts';

const validInput = {
  children: [
    {
      dobMonth: '2024-11',
      disabled: false,
      attendance: { daysPerWeek: 3, hoursPerDay: 10, pattern: 'term-time-38' },
    },
  ],
  parents: { count: 2, allMeetMinimumEarnings: 'yes', anyOver100k: 'no' },
  universalCredit: { receives: false },
  jurisdiction: 'england',
};

describe('FamilyProfile fixtures', () => {
  it('all fixtures parse and re-parse unchanged', () => {
    for (const fixture of [
      workingFamilyOneChild,
      ucHouseholdTwoChildren,
      unsureEligibilityFamily,
    ]) {
      expect(FamilyProfile.parse(fixture)).toEqual(fixture);
    }
  });

  it('supports multiple children with per-child attendance', () => {
    expect(ucHouseholdTwoChildren.children).toHaveLength(2);
    expect(ucHouseholdTwoChildren.children[1]?.disabled).toBe(true);
  });
});

describe('FamilyProfile validation', () => {
  it('parses a minimal valid input', () => {
    expect(FamilyProfile.safeParse(validInput).success).toBe(true);
  });

  it('rejects an empty children array with a useful message', () => {
    const result = FamilyProfile.safeParse({ ...validInput, children: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('A family profile needs at least one child');
  });

  it('rejects a UC claimant household without its figures', () => {
    const result = FamilyProfile.safeParse({
      ...validInput,
      universalCredit: { receives: true },
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toContain('universalCredit.netMonthlyEarnings');
    expect(paths).toContain('universalCredit.currentMonthlyAward');
  });

  it('rejects fractional pence in UC figures', () => {
    const result = FamilyProfile.safeParse({
      ...validInput,
      universalCredit: {
        receives: true,
        netMonthlyEarnings: 1450.5,
        currentMonthlyAward: 89600,
        earnsAboveBenefitCapThreshold: 'yes',
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Money must be an integer number of pence, never a fractional amount',
    );
  });

  it.each([
    [{ daysPerWeek: 0 }, 'Attendance needs at least one day per week'],
    [{ daysPerWeek: 8 }, 'There are at most 7 days in a week'],
    [{ daysPerWeek: 2.5 }, 'Days per week must be a whole number'],
    [{ hoursPerDay: 0 }, 'Hours per day must be more than zero'],
    [{ hoursPerDay: 25 }, 'Hours per day cannot exceed 24'],
  ])('rejects attendance %j', (override, message) => {
    const result = FamilyProfile.safeParse({
      ...validInput,
      children: [
        {
          ...validInput.children[0],
          attendance: { ...validInput.children[0]?.attendance, ...override },
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it('rejects malformed birth months', () => {
    const result = FamilyProfile.safeParse({
      ...validInput,
      children: [{ ...validInput.children[0], dobMonth: '2024-13' }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Expected a month in YYYY-MM form, e.g. 2026-08');
  });

  it('rejects households outside the modelled jurisdictions', () => {
    expect(FamilyProfile.safeParse({ ...validInput, jurisdiction: 'scotland' }).success).toBe(
      false,
    );
  });

  it('rejects parent counts other than 1 or 2', () => {
    const result = FamilyProfile.safeParse({
      ...validInput,
      parents: { ...validInput.parents, count: 3 },
    });
    expect(result.success).toBe(false);
  });
});
