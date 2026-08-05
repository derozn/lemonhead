import { FamilyProfile, isoMonth } from '@lemonhead/schemas';
import type { FeeSchedule } from '@lemonhead/schemas';
import {
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
} from '@lemonhead/schemas/fixtures';
import fc from 'fast-check';
import { describe, it } from 'vitest';

import { calculateGross } from './gross.ts';
import { buildTimeline } from './timeline.ts';

const FIXTURES: FeeSchedule[] = [
  perDayHoursDeduction,
  perHourConditionalFunding,
  fundedRateDeduction,
];

const childArb = fc.record({
  dobMonth: fc.constantFrom('2026-10', '2026-01', '2024-06', '2023-03', '2022-01'),
  daysPerWeek: fc.integer({ min: 1, max: 7 }),
  hoursPerDay: fc.constantFrom(4, 5.25, 7.5, 10, 10.5),
  pattern: fc.constantFrom('term-time-38', 'stretched-all-year'),
});

const profileArb = fc.array(childArb, { minLength: 1, maxLength: 3 }).map((children) =>
  FamilyProfile.parse({
    children: children.map((child) => ({
      dobMonth: child.dobMonth,
      disabled: false,
      attendance: {
        daysPerWeek: child.daysPerWeek,
        hoursPerDay: child.hoursPerDay,
        pattern: child.pattern,
      },
    })),
    parents: { count: 2, allInPaidWork: 'yes', allMeetMinimumEarnings: 'yes', anyOver100k: 'no' },
    universalCredit: { receives: false },
    jurisdiction: 'england',
  }),
);

const scheduleArb = fc.constantFrom(...FIXTURES);

describe('gross calculation properties', () => {
  it('non-excluded lines sum exactly to each month total', () => {
    fc.assert(
      fc.property(profileArb, scheduleArb, (profile, schedule) => {
        const months = calculateGross(
          schedule,
          buildTimeline(profile, schedule, isoMonth('2026-08')),
        );
        for (const month of months) {
          const summed = month.lines
            .filter((line) => !line.excludedFromTotal)
            .reduce((total, line) => total + line.amountPence, 0);
          if (summed !== month.totalPence) return false;
        }
        return true;
      }),
    );
  });

  it('gross fee lines and month totals are never negative', () => {
    fc.assert(
      fc.property(profileArb, scheduleArb, (profile, schedule) => {
        const months = calculateGross(
          schedule,
          buildTimeline(profile, schedule, isoMonth('2026-08')),
        );
        return months.every(
          (month) =>
            month.totalPence >= 0 &&
            month.lines
              .filter((line) => line.kind === 'gross-fees')
              .every((line) => line.amountPence >= 0),
        );
      }),
    );
  });

  it('is monotonic in days booked for a single child', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.constantFrom(4, 5.25, 7.5, 10),
        fc.constantFrom('term-time-38', 'stretched-all-year'),
        scheduleArb,
        (daysPerWeek, hoursPerDay, pattern, schedule) => {
          const totalsFor = (days: number) => {
            const profile = FamilyProfile.parse({
              children: [
                {
                  dobMonth: '2024-06',
                  disabled: false,
                  attendance: { daysPerWeek: days, hoursPerDay, pattern },
                },
              ],
              parents: {
                count: 2,
                allInPaidWork: 'yes',
                allMeetMinimumEarnings: 'yes',
                anyOver100k: 'no',
              },
              universalCredit: { receives: false },
              jurisdiction: 'england',
            });
            return calculateGross(
              schedule,
              buildTimeline(profile, schedule, isoMonth('2026-08')),
            ).map((month) => month.totalPence);
          };
          const fewer = totalsFor(daysPerWeek);
          const more = totalsFor(daysPerWeek + 1);
          return fewer.every((total, index) => total <= (more[index] ?? Number.NEGATIVE_INFINITY));
        },
      ),
    );
  });
});
