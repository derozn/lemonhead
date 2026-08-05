import { isoDate, isoMonth } from '@lemonhead/schemas';
import type { FamilyProfile, FeeSchedule, YesNoUnsure } from '@lemonhead/schemas';
import {
  familyOf,
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
} from '@lemonhead/schemas/fixtures';
import fc from 'fast-check';
import { describe, it } from 'vitest';

import { fundedHoursEngland2026April } from '../rules/funded-hours/params/2026-04-06.england.ts';

import { applyFunding } from './funding.ts';
import { calculateGross } from './gross.ts';
import { calculateProjection } from './projection.ts';
import { buildTimeline } from './timeline.ts';

function grossFor(profile: FamilyProfile, schedule: FeeSchedule) {
  return calculateGross(schedule, buildTimeline(profile, schedule, isoMonth('2026-08')));
}

const childArb = fc.record({
  dobMonth: fc.constantFrom('2026-10', '2026-01', '2024-06', '2023-03', '2022-01'),
  daysPerWeek: fc.integer({ min: 1, max: 7 }),
  hoursPerDay: fc.constantFrom(4, 5.25, 7.5, 10, 10.5),
  pattern: fc.constantFrom('term-time-38', 'stretched-all-year'),
});

const profileArb = fc
  .array(childArb, { minLength: 1, maxLength: 3 })
  .map((children) => familyOf(...children));

const scheduleArb = fc.constantFrom<FeeSchedule>(
  perDayHoursDeduction,
  perHourConditionalFunding,
  fundedRateDeduction,
);

describe('gross calculation properties', () => {
  it('non-excluded lines sum exactly to each month total', () => {
    fc.assert(
      fc.property(profileArb, scheduleArb, (profile, schedule) => {
        // Independent oracle on purpose: a plain reduce, not sumPence.
        return grossFor(profile, schedule).every(
          (month) =>
            month.lines
              .filter((line) => !line.excludedFromTotal)
              .reduce((total, line) => total + line.amountPence, 0) === month.totalPence,
        );
      }),
    );
  });

  it('gross fee lines and month totals are never negative', () => {
    fc.assert(
      fc.property(profileArb, scheduleArb, (profile, schedule) => {
        return grossFor(profile, schedule).every(
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
          const totalsFor = (days: number) =>
            grossFor(
              familyOf({ dobMonth: '2024-06', daysPerWeek: days, hoursPerDay, pattern }),
              schedule,
            ).map((month) => month.totalPence);
          const fewer = totalsFor(daysPerWeek);
          const more = totalsFor(daysPerWeek + 1);
          return fewer.every((total, index) => total <= (more[index] ?? Number.NEGATIVE_INFINITY));
        },
      ),
    );
  });
});

const fundedProfileArb = fc
  .tuple(profileArb, fc.constantFrom<YesNoUnsure>('yes', 'no', 'unsure'))
  .map(([profile, allMeetMinimumEarnings]) => ({
    ...profile,
    parents: { ...profile.parents, allMeetMinimumEarnings },
  }));

describe('funding properties', () => {
  it('net ≤ gross, net ≥ 0, and deductions never exceed the discounted fee', () => {
    fc.assert(
      fc.property(fundedProfileArb, scheduleArb, (profile, schedule) => {
        const timeline = buildTimeline(profile, schedule, isoMonth('2026-08'));
        const gross = calculateGross(schedule, timeline);
        const net = applyFunding(profile, schedule, fundedHoursEngland2026April, timeline, gross);
        return net.every((month, index) => {
          const grossMonth = gross[index];
          if (!grossMonth) return false;
          if (month.totalPence > grossMonth.totalPence || month.totalPence < 0) return false;
          return month.lines
            .filter((line) => line.kind === 'funded-hours-deduction')
            .every((line) => {
              const fee = month.lines.find(
                (candidate) =>
                  candidate.kind === 'gross-fees' && candidate.childIndex === line.childIndex,
              );
              const discounts = month.lines
                .filter(
                  (candidate) =>
                    candidate.kind === 'sibling-discount' &&
                    candidate.childIndex === line.childIndex,
                )
                .reduce((total, candidate) => total + candidate.amountPence, 0);
              return fee !== undefined && 0 - line.amountPence <= fee.amountPence + discounts;
            });
        });
      }),
    );
  });
});

describe('projection properties', () => {
  it('validates itself, sums per month and annually, and never exceeds gross', () => {
    fc.assert(
      fc.property(fundedProfileArb, scheduleArb, (profile, schedule) => {
        const projection = calculateProjection(schedule, profile, {
          asOfDate: isoDate('2026-08-05'),
        });
        const monthsOk = projection.months.every(
          (month) =>
            month.totalPence >= 0 &&
            month.lines
              .filter((line) => !line.excludedFromTotal)
              .reduce((total, line) => total + line.amountPence, 0) === month.totalPence,
        );
        const monthSum = projection.months.reduce((total, month) => total + month.totalPence, 0);
        const annualOk =
          projection.annual.netPence === monthSum &&
          projection.annual.netPence <= projection.annual.grossPence &&
          projection.annual.grossPence - projection.annual.deductionsPence ===
            projection.annual.netPence;
        return monthsOk && annualOk && projection.ruleSetId.startsWith('england/');
      }),
    );
  });
});
