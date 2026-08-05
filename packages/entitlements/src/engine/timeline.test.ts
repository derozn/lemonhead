import { isoMonth } from '@lemonhead/schemas';
import {
  familyOf,
  perDayHoursDeduction,
  perHourConditionalFunding,
  workingFamilyOneChild,
} from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { buildTimeline, DEFAULT_HORIZON_MONTHS } from './timeline.ts';

describe('buildTimeline', () => {
  // workingFamilyOneChild: one child born 2024-11, 3 term-time days of 10h.
  const timeline = buildTimeline(workingFamilyOneChild, perDayHoursDeduction, isoMonth('2026-08'));

  it('builds a 12-month horizon by default with per-month ages', () => {
    expect(timeline).toHaveLength(DEFAULT_HORIZON_MONTHS);
    expect(timeline[0]?.month).toBe('2026-08');
    expect(timeline[11]?.month).toBe('2027-07');
    expect(timeline[0]?.children[0]?.ageMonths).toBe(21);
    expect(timeline[11]?.children[0]?.ageMonths).toBe(32);
  });

  it('assigns bands with exclusive upper bounds, crossing mid-horizon', () => {
    // Age 23 in 2026-10 is still Babies (0-24); age 24 in 2026-11 is Toddlers.
    expect(timeline[2]?.children[0]?.band).toEqual({
      status: 'in-band',
      ageBandId: 'babies',
      bandLabel: 'Babies (0-2)',
    });
    expect(timeline[3]?.children[0]?.band).toMatchObject({ ageBandId: 'toddlers' });
  });

  it('places an older child in the open-ended oldest band', () => {
    const older = buildTimeline(
      familyOf({ dobMonth: '2022-01' }),
      perDayHoursDeduction,
      isoMonth('2026-08'),
    );
    expect(older[0]?.children[0]?.ageMonths).toBe(55);
    expect(older[0]?.children[0]?.band).toMatchObject({ ageBandId: 'preschool' });
  });

  it('marks a child not yet born, then in no matching band, then in band', () => {
    // Little Acorns bands start at 9 months. Born 2026-10: not-born in August,
    // no matching band from birth until 9 months (2027-07).
    const late = buildTimeline(
      familyOf({ dobMonth: '2026-10' }),
      perHourConditionalFunding,
      isoMonth('2026-08'),
    );
    expect(late[0]?.children[0]?.band).toEqual({ status: 'not-born' });
    expect(late[2]?.children[0]?.band).toEqual({ status: 'no-matching-band' });
    expect(late[10]?.children[0]?.band).toEqual({ status: 'no-matching-band' });
    expect(late[11]?.children[0]?.band).toMatchObject({ ageBandId: 'under-3' });
  });

  it('supports custom horizons and multiple children', () => {
    const short = buildTimeline(
      familyOf({ dobMonth: '2024-11' }, { dobMonth: '2022-01' }),
      perDayHoursDeduction,
      isoMonth('2026-08'),
      3,
    );
    expect(short).toHaveLength(3);
    expect(short[0]?.children).toHaveLength(2);
  });
});
