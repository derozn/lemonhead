import { isoDate, UniversalCreditStatus } from '@lemonhead/schemas';
import type { FamilyProfile } from '@lemonhead/schemas';
import {
  familyOf,
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
} from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { calculateProjection } from './projection.ts';

/**
 * Regression encodings of docs/acceptance-scenarios.md. Every expected figure
 * was computed by hand in the doc first; the engine must match to the penny.
 */
const AS_OF = { asOfDate: isoDate('2026-08-05') };

function nets(projection: ReturnType<typeof calculateProjection>): number[] {
  return projection.months.map((month) => month.totalPence);
}

describe('acceptance scenarios', () => {
  it('A: fully funded working family at Sunny Bank', () => {
    const projection = calculateProjection(
      perDayHoursDeduction,
      familyOf({ dobMonth: '2024-11' }),
      AS_OF,
    );
    expect(nets(projection)).toEqual([
      11220, 7220, 7220, 7220, 7220, 7220, 7220, 7220, 7220, 7220, 7220, 7220,
    ]);
    expect(projection.annual).toEqual({
      grossPence: 842900,
      deductionsPence: 752260,
      netPence: 90640,
    });
    expect(projection.ruleSetId).toBe(
      'england/funded-hours@2026-04-06+tfc@2026-04-06+uc@2026-04-06',
    );
  });

  it('B: capped funding at Little Acorns', () => {
    const projection = calculateProjection(
      perHourConditionalFunding,
      familyOf({ dobMonth: '2024-01', daysPerWeek: 2, hoursPerDay: 8 }),
      AS_OF,
    );
    expect(nets(projection)).toEqual([
      4180, 4180, 4180, 4180, 4180, 4028, 4028, 4028, 4028, 4028, 4028, 4028,
    ]);
    expect(projection.annual.netPence).toBe(49096);
    expect(projection.annual.grossPence).toBe(525920);
  });

  it('C: funded-rate deduction at The Orchard', () => {
    const projection = calculateProjection(
      fundedRateDeduction,
      familyOf({ dobMonth: '2024-06', daysPerWeek: 5 }),
      AS_OF,
    );
    expect(nets(projection)).toEqual([
      44713, 44713, 44713, 44713, 44713, 44713, 44713, 44713, 44713, 44713, 40913, 40913,
    ]);
    expect(projection.annual.netPence).toBe(528956);
  });

  it('D: November-birthday transition on the universal offer only', () => {
    const profile: FamilyProfile = {
      ...familyOf({ dobMonth: '2023-11' }),
      parents: {
        count: 2,
        allInPaidWork: 'yes',
        allMeetMinimumEarnings: 'no',
        anyOver100k: 'no',
      },
    };
    const projection = calculateProjection(perDayHoursDeduction, profile, AS_OF);
    expect(nets(projection)).toEqual([
      73400, 68400, 68400, 65550, 65550, 41800, 41800, 41800, 41800, 41800, 41800, 41800,
    ]);
    expect(projection.annual.netPence).toBe(633900);
    expect(projection.eligibility.children[0]?.workingParentFundedHours.status).toBe('ineligible');
    expect(projection.eligibility.children[0]?.universalFundedHours.status).toBe('eligible');
    expect(projection.eligibility.children[0]?.taxFreeChildcare.status).toBe('ineligible');
  });

  it('F: Universal Credit household with two children at Sunny Bank', () => {
    const profile: FamilyProfile = {
      ...familyOf(
        { dobMonth: '2023-03', daysPerWeek: 5, hoursPerDay: 8, pattern: 'stretched-all-year' },
        { dobMonth: '2025-09', daysPerWeek: 2, hoursPerDay: 6, pattern: 'stretched-all-year' },
      ),
      parents: { count: 1, allInPaidWork: 'yes', allMeetMinimumEarnings: 'yes', anyOver100k: 'no' },
      universalCredit: UniversalCreditStatus.parse({
        receives: true,
        netMonthlyEarnings: 145000,
        currentMonthlyAward: 89600,
      }),
    };
    const projection = calculateProjection(perDayHoursDeduction, profile, AS_OF);
    expect(nets(projection)).toEqual([
      21977, 11743, 11743, 11743, 11743, 11743, 11743, 11743, 11743, 11743, 11743, 11743,
    ]);
    expect(projection.annual).toEqual({
      grossPence: 2389144,
      deductionsPence: 2237994,
      netPence: 151150,
    });
    expect(projection.eligibility.universalCredit.status).toBe('eligible');
    expect(
      projection.months.flatMap((month) => month.lines).some((line) => line.kind === 'tfc-top-up'),
    ).toBe(false);
  });

  it('lines carry sources: rules cite gov.uk, fees point into the schedule', () => {
    const projection = calculateProjection(
      perDayHoursDeduction,
      familyOf({ dobMonth: '2024-11' }),
      AS_OF,
    );
    const lines = projection.months[0]?.lines ?? [];
    const deduction = lines.find((line) => line.kind === 'funded-hours-deduction');
    expect(deduction?.source).toMatchObject({ type: 'rule' });
    const fee = lines.find((line) => line.kind === 'gross-fees');
    expect(fee?.source).toMatchObject({ type: 'fee-schedule', sessionId: 'full-day' });
    const topUp = lines.find((line) => line.kind === 'tfc-top-up');
    expect(topUp?.source).toMatchObject({ type: 'rule' });
    const signpost = lines.find((line) => line.kind === 'uc-signpost');
    expect(signpost?.source).toMatchObject({ type: 'rule' });
  });
});
