import { FamilyProfile } from '../family-profile.ts';

/**
 * Realistic family fixtures, parsed at module load so an invalid fixture
 * fails fast. Shared by schema tests now and engine tests from task 4 on.
 */

/** Two working parents, one toddler, three term-time days a week. */
export const workingFamilyOneChild: FamilyProfile = FamilyProfile.parse({
  children: [
    {
      dobMonth: '2024-11',
      disabled: false,
      attendance: { daysPerWeek: 3, hoursPerDay: 10, pattern: 'term-time-38' },
    },
  ],
  parents: { count: 2, allInPaidWork: 'yes', allMeetMinimumEarnings: 'yes', anyOver100k: 'no' },
  universalCredit: { receives: false },
  jurisdiction: 'england',
});

/**
 * Single working parent on Universal Credit with two children, one disabled.
 * Earnings £1,450.00, current award £896.00 (values in pence).
 */
export const ucHouseholdTwoChildren: FamilyProfile = FamilyProfile.parse({
  children: [
    {
      dobMonth: '2023-03',
      disabled: false,
      attendance: { daysPerWeek: 5, hoursPerDay: 8, pattern: 'stretched-all-year' },
    },
    {
      dobMonth: '2025-09',
      disabled: true,
      attendance: { daysPerWeek: 2, hoursPerDay: 6, pattern: 'stretched-all-year' },
    },
  ],
  parents: { count: 1, allInPaidWork: 'yes', allMeetMinimumEarnings: 'yes', anyOver100k: 'no' },
  universalCredit: {
    receives: true,
    netMonthlyEarnings: 145000,
    currentMonthlyAward: 89600,
  },
  jurisdiction: 'england',
});

/** A family that can't answer the eligibility questions yet. */
export const unsureEligibilityFamily: FamilyProfile = FamilyProfile.parse({
  children: [
    {
      dobMonth: '2026-01',
      disabled: false,
      attendance: { daysPerWeek: 4, hoursPerDay: 9, pattern: 'term-time-38' },
    },
  ],
  parents: {
    count: 2,
    allInPaidWork: 'unsure',
    allMeetMinimumEarnings: 'unsure',
    anyOver100k: 'unsure',
  },
  universalCredit: { receives: false },
  jurisdiction: 'england',
});
