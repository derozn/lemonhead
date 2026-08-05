import type { FamilyProfile } from '@lemonhead/schemas';
import { FeeSchedule, isoMonth, Pence, SessionId } from '@lemonhead/schemas';
import {
  familyOf,
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
  unsureEligibilityFamily,
} from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { fundedHoursEngland2026April } from '../rules/funded-hours/params/2026-04-06.england.ts';

import { applyFunding } from './funding.ts';
import { calculateGross } from './gross.ts';
import type { MonthlyGross } from './gross.ts';
import { buildTimeline } from './timeline.ts';

const params = fundedHoursEngland2026April;

function fundedMonths(profile: FamilyProfile, schedule: FeeSchedule, start = '2026-08') {
  const timeline = buildTimeline(profile, schedule, isoMonth(start));
  const gross = calculateGross(schedule, timeline);
  return applyFunding(profile, schedule, params, timeline, gross);
}

function testSchedule(overrides: Record<string, unknown> = {}): FeeSchedule {
  return FeeSchedule.parse({
    nursery: { name: 'Test Nursery', source: 'manual-entry' },
    ageBands: [{ id: 'all', label: 'All ages', fromMonths: 0, toMonths: 72 }],
    sessions: [{ id: 'day', kind: 'full-day', label: 'Day', hours: 10 }],
    prices: [{ ageBandId: 'all', sessionId: 'day', rate: 6000 }],
    discounts: [],
    extras: [],
    fundingPolicy: { kind: 'hours-deduction' },
    attendancePatterns: ['term-time-38'],
    ...overrides,
  });
}

describe('policy variant: hours-deduction', () => {
  // Sunny Bank, 3 × 10h term-time days = 1,140 attended hours a year, which
  // the 30-hour offer covers entirely: the whole fee is funded and only the
  // £9.50/day consumables charge remains: 2850 × 38 / 12 = 9025 a month.
  const months = fundedMonths(familyOf({ dobMonth: '2024-11' }), perDayHoursDeduction);

  it('funds the full fee when attendance is within the entitlement', () => {
    expect(months.map((m) => m.totalPence)).toEqual([
      14025, // 74100 gross + 5000 registration - 74100 funded + 9025 consumables
      9025,
      9025,
      9025,
      9025,
      9025,
      9025,
      9025,
      9025,
      9025,
      9025,
      9025,
    ]);
  });

  it('itemises the deduction with hours, offer name, and citation', () => {
    const deduction = months[0]?.lines.find((line) => line.kind === 'funded-hours-deduction');
    expect(deduction?.amountPence).toBe(-74100);
    expect(deduction?.description).toContain('1140 of 1140');
    expect(deduction?.description).toContain('working-parent offer');
    expect(deduction?.citation?.url).toContain('gov.uk');
  });

  it('charges consumables per day only alongside applied funding', () => {
    const consumables = months[1]?.lines.find((line) => line.kind === 'consumables-charge');
    expect(consumables?.amountPence).toBe(9025);
  });
});

describe('policy variant: funded-rate-deduction', () => {
  // The Orchard deducts at £5.70/h. 5 × 10h term-time days = 1,900 attended
  // hours; 1,140 are funded: 570 × 1140 / 12 = 54150. Twos gross is
  // 6400 × 5 × 38 / 12 = 101333; weekly consumables 2750 × 38 / 12 = 8708.
  it('deducts at the stated funded rate, not the headline rate', () => {
    const months = fundedMonths(
      familyOf({ dobMonth: '2024-06', daysPerWeek: 5 }),
      fundedRateDeduction,
    );
    expect(months[0]?.totalPence).toBe(55891); // 101333 - 54150 + 8708
    const deduction = months[0]?.lines.find((line) => line.kind === 'funded-hours-deduction');
    expect(deduction?.amountPence).toBe(-54150);
  });
});

describe('policy variant: sessions-allocated', () => {
  it('funds whole booked sessions from the allocated list', () => {
    // 114 attended day-sessions a year, all coverable by 1,140 hours:
    // deduction 6000 × 114 / 12 = 57000 = the entire gross fee.
    const s = testSchedule({
      fundingPolicy: { kind: 'sessions-allocated', fundedSessionIds: ['day'] },
    });
    const months = fundedMonths(familyOf({ dobMonth: '2024-01' }), s);
    expect(months[0]?.lines.find((l) => l.kind === 'funded-hours-deduction')?.amountPence).toBe(
      -57000,
    );
    expect(months[0]?.totalPence).toBe(0);
  });

  it('explains when the booked session is not an allocated one', () => {
    const s = testSchedule({
      sessions: [
        { id: 'day', kind: 'full-day', label: 'Day', hours: 10 },
        { id: 'half', kind: 'half-day', label: 'Half', hours: 5 },
      ],
      prices: [
        { ageBandId: 'all', sessionId: 'day', rate: 6000 },
        { ageBandId: 'all', sessionId: 'half', rate: 3500 },
      ],
      fundingPolicy: { kind: 'sessions-allocated', fundedSessionIds: ['half'] },
    });
    const months = fundedMonths(familyOf({ dobMonth: '2024-01' }), s);
    const note = months[0]?.lines.find((line) => line.kind === 'funding-note');
    expect(note?.description).toContain('not one this nursery funds');
    expect(months[0]?.lines.find((l) => l.kind === 'funded-hours-deduction')).toBeUndefined();
  });
});

describe('policy variants: not-offered and unknown', () => {
  it('explains a nursery that does not offer funded places', () => {
    const months = fundedMonths(
      familyOf({ dobMonth: '2024-01' }),
      testSchedule({ fundingPolicy: { kind: 'not-offered' } }),
    );
    expect(months[0]?.lines.find((l) => l.kind === 'funding-note')?.description).toContain(
      'does not offer funded places',
    );
  });

  it('flags an unknown policy instead of guessing', () => {
    const months = fundedMonths(
      familyOf({ dobMonth: '2024-01' }),
      testSchedule({ fundingPolicy: { kind: 'unknown' } }),
    );
    const note = months[0]?.lines.find((l) => l.kind === 'funding-note');
    expect(note?.description).toContain('funding policy unknown');
    expect(note?.assumptions.join(' ')).toContain('rather than guessed');
    expect(months[0]?.totalPence).toBe(57000); // full gross, no deduction
  });
});

describe('nursery condition: minDaysPerWeek', () => {
  it('withholds funding below the day threshold, with the reason named', () => {
    const months = fundedMonths(
      familyOf({ dobMonth: '2024-01', daysPerWeek: 1, hoursPerDay: 8 }),
      perHourConditionalFunding, // requires 2+ days
    );
    const note = months[0]?.lines.find((l) => l.kind === 'funding-note');
    expect(note?.description).toContain('at least 2 days');
    expect(months[0]?.lines.find((l) => l.kind === 'funded-hours-deduction')).toBeUndefined();
  });
});

describe('nursery condition: maxFundedHoursPerWeek', () => {
  // Little Acorns caps funding at 15 h/week: 570 funded of 608 attended
  // hours. Deduction: 43067 × 2280 / 2432 = 40375. Net fee 2692 + lunch 2533.
  const months = fundedMonths(
    familyOf({ dobMonth: '2024-01', daysPerWeek: 2, hoursPerDay: 8 }),
    perHourConditionalFunding,
  );

  it('caps the funded hours and says so', () => {
    expect(months[0]?.totalPence).toBe(5225); // 43067 - 40375 + 2533
    const deduction = months[0]?.lines.find((l) => l.kind === 'funded-hours-deduction');
    expect(deduction?.amountPence).toBe(-40375);
    expect(deduction?.description).toContain('570 of 608');
    expect(deduction?.assumptions.join(' ')).toContain('at most 15 funded hours');
  });

  it('recomputes across the mid-horizon band change', () => {
    expect(months[5]?.totalPence).toBe(5035); // 40027 - 37525 + 2533 from January
  });
});

describe('nursery condition: termTimeOnly', () => {
  it('withholds funding from stretched attendance when term-time only', () => {
    const months = fundedMonths(
      familyOf({ dobMonth: '2024-06', daysPerWeek: 5, pattern: 'stretched-all-year' }),
      fundedRateDeduction, // termTimeOnly: true
    );
    const note = months[0]?.lines.find((l) => l.kind === 'funding-note');
    expect(note?.description).toContain('term-time attendance only');
  });
});

describe('nursery condition: restrictedToSessionIds', () => {
  it('withholds funding when the booked session is outside the restriction', () => {
    const s = testSchedule({
      sessions: [
        { id: 'day', kind: 'full-day', label: 'Day', hours: 10 },
        { id: 'half', kind: 'half-day', label: 'Half', hours: 5 },
      ],
      prices: [
        { ageBandId: 'all', sessionId: 'day', rate: 6000 },
        { ageBandId: 'all', sessionId: 'half', rate: 3500 },
      ],
      fundingPolicy: {
        kind: 'hours-deduction',
        conditions: { restrictedToSessionIds: ['half'] },
      },
    });
    const months = fundedMonths(familyOf({ dobMonth: '2024-01' }), s); // books 'day'
    expect(months[0]?.lines.find((l) => l.kind === 'funding-note')?.description).toContain(
      'restricts funding to sessions',
    );
  });
});

describe('nursery condition: conditionsUnknown', () => {
  it('applies funding but flags the unknown conditions', () => {
    const s = testSchedule({
      fundingPolicy: { kind: 'hours-deduction', conditions: { conditionsUnknown: true } },
    });
    const months = fundedMonths(familyOf({ dobMonth: '2024-01' }), s);
    const deduction = months[0]?.lines.find((l) => l.kind === 'funded-hours-deduction');
    expect(deduction?.amountPence).toBe(-57000);
    expect(deduction?.assumptions.join(' ')).toContain('not fully known');
  });
});

describe('term-after-birthday starts (the November-birthday scenario)', () => {
  // Sunny Bank; parents fail the earnings test, so only the universal offer
  // applies. Child born November 2023: moves Toddlers → Preschool in
  // November 2026 (65550 gross), and the universal 15 hours start the term
  // after the third birthday: 1 January 2027. From January: 570 of 1,140
  // hours funded, 65550 × 2280/4560 = 32775 off, plus 9025 consumables.
  const profile: FamilyProfile = {
    ...familyOf({ dobMonth: '2023-11' }),
    parents: {
      count: 2,
      allInPaidWork: 'yes',
      allMeetMinimumEarnings: 'no',
      anyOver100k: 'no',
    },
  };
  const months = fundedMonths(profile, perDayHoursDeduction);

  it('matches the hand-computed month-by-month totals to the penny', () => {
    expect(months.map((m) => m.totalPence)).toEqual([
      73400, // Toddlers 68400 + registration 5000, no funding yet
      68400,
      68400,
      65550, // Preschool from November, still unfunded
      65550,
      41800, // January: 65550 - 32775 universal deduction + 9025 consumables
      41800,
      41800,
      41800,
      41800,
      41800,
      41800,
    ]);
  });

  it('names the universal offer on the deduction line', () => {
    const deduction = months[5]?.lines.find((l) => l.kind === 'funded-hours-deduction');
    expect(deduction?.description).toContain('universal 3-to-4 offer');
    expect(deduction?.description).toContain('570 of 1140');
  });

  it('adds no funding lines before the entitlement starts', () => {
    expect(months[2]?.lines.some((l) => l.kind === 'funding-note')).toBe(false);
    expect(months[4]?.lines.some((l) => l.kind === 'funded-hours-deduction')).toBe(false);
  });
});

describe('needs-info answers', () => {
  it('notes the possible 30 hours instead of assuming them', () => {
    // Unsure family, child born 2026-01: reaches 9 months in October 2026,
    // so the working-parent offer would start 1 January 2027 if confirmed.
    const months = fundedMonths(unsureEligibilityFamily, perDayHoursDeduction);
    expect(months[2]?.lines.some((l) => l.kind === 'funding-note')).toBe(false);
    const note = months[5]?.lines.find((l) => l.kind === 'funding-note');
    expect(note?.description).toContain('not applied yet');
    expect(note?.assumptions.join(' ')).toContain('eligibility questions');
    expect(months[5]?.lines.some((l) => l.kind === 'funded-hours-deduction')).toBe(false);
  });
});

describe('consumables cadences', () => {
  it('charges per funded hour when the policy says so', () => {
    const s = testSchedule({
      fundingPolicy: {
        kind: 'hours-deduction',
        consumablesCharge: { amount: 30, per: 'funded-hour' },
      },
    });
    const months = fundedMonths(familyOf({ dobMonth: '2024-01' }), s);
    // 1,140 funded hours × £0.30 / 12 = 2850.
    expect(months[0]?.lines.find((l) => l.kind === 'consumables-charge')?.amountPence).toBe(2850);
  });
});

describe('deduction interacts safely with sibling discounts', () => {
  it('never takes a child below zero once discounts applied', () => {
    // Both children fully funded; the 10% oldest-child discount already took
    // 10% off, so the deduction caps at the discounted fee.
    const months = fundedMonths(
      familyOf({ dobMonth: '2022-01' }, { dobMonth: '2024-11' }),
      perDayHoursDeduction,
    );
    for (const month of months) {
      expect(month.totalPence).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('defensive paths and invariants', () => {
  const child = familyOf({ dobMonth: '2024-01' });

  function fabricatedGross(schedule: FeeSchedule, sessionId: string | undefined): MonthlyGross[] {
    return [
      {
        month: isoMonth('2026-08'),
        lines: [
          {
            kind: 'gross-fees',
            childIndex: 0,
            amountPence: Pence.parse(50000),
            description: 'fabricated',
            sessionId: sessionId === undefined ? undefined : SessionId.parse(sessionId),
            ageBandId: schedule.ageBands[0]?.id,
            excludedFromTotal: false,
            citation: undefined,
            assumptions: [],
          },
        ],
        totalPence: Pence.parse(50000),
      },
    ];
  }

  it('survives an allocated session that is not defined', () => {
    const s = {
      ...testSchedule(),
      fundingPolicy: {
        kind: 'sessions-allocated' as const,
        fundedSessionIds: [SessionId.parse('ghost')],
      },
    };
    const timeline = buildTimeline(child, s, isoMonth('2026-08'), 1);
    const months = applyFunding(child, s, params, timeline, fabricatedGross(s, 'ghost'));
    expect(months[0]?.lines.find((l) => l.kind === 'funding-note')?.description).toContain(
      'not one this nursery funds',
    );
  });

  it('survives an allocated session with no price for the band', () => {
    const s = testSchedule({
      sessions: [
        { id: 'day', kind: 'full-day', label: 'Day', hours: 10 },
        { id: 'extra', kind: 'half-day', label: 'Extra', hours: 5 },
      ],
      fundingPolicy: { kind: 'sessions-allocated', fundedSessionIds: ['extra'] },
    });
    const timeline = buildTimeline(child, s, isoMonth('2026-08'), 1);
    const months = applyFunding(child, s, params, timeline, fabricatedGross(s, 'extra'));
    expect(months[0]?.lines.find((l) => l.kind === 'funding-note')).toBeDefined();
  });

  it('refuses misaligned gross months', () => {
    const s = testSchedule();
    const timeline = buildTimeline(child, s, isoMonth('2026-08'));
    expect(() => applyFunding(child, s, params, timeline, [])).toThrow(RangeError);
  });

  it('refuses a timeline built from a different profile', () => {
    const s = testSchedule();
    const twoChildren = familyOf({ dobMonth: '2024-01' }, { dobMonth: '2022-05' });
    const timeline = buildTimeline(twoChildren, s, isoMonth('2026-08'));
    const gross = calculateGross(s, timeline);
    expect(() => applyFunding(child, s, params, timeline, gross)).toThrow(RangeError);
  });

  it('handles a fee line with no session against session-based policies', () => {
    const restricted = testSchedule({
      fundingPolicy: { kind: 'hours-deduction', conditions: { restrictedToSessionIds: ['day'] } },
    });
    const timeline = buildTimeline(child, restricted, isoMonth('2026-08'), 1);
    const restrictedMonths = applyFunding(
      child,
      restricted,
      params,
      timeline,
      fabricatedGross(restricted, undefined),
    );
    expect(
      restrictedMonths[0]?.lines.find((l) => l.kind === 'funding-note')?.description,
    ).toContain('restricts funding');

    const allocated = testSchedule({
      fundingPolicy: { kind: 'sessions-allocated', fundedSessionIds: ['day'] },
    });
    const allocatedMonths = applyFunding(
      child,
      allocated,
      params,
      buildTimeline(child, allocated, isoMonth('2026-08'), 1),
      fabricatedGross(allocated, undefined),
    );
    expect(allocatedMonths[0]?.lines.find((l) => l.kind === 'funding-note')?.description).toContain(
      'not one this nursery funds',
    );
  });

  it('adds no funding lines for a month with no priced fee', () => {
    const s = testSchedule({
      ageBands: [
        { id: 'all', label: 'All ages', fromMonths: 0, toMonths: 36 },
        { id: 'older', label: 'Older', fromMonths: 36, toMonths: 72 },
      ],
    });
    const months = fundedMonths(familyOf({ dobMonth: '2022-01' }), s); // older, unpriced
    expect(months[0]?.lines.some((l) => l.kind === 'funded-hours-deduction')).toBe(false);
    expect(months[0]?.lines.some((l) => l.kind === 'funding-note')).toBe(false);
  });
});

describe('entitlement timing for eligible families', () => {
  it('starts the working-parent offer at the term boundary', () => {
    // Born January 2026: 9 months in October, so funding starts 1 January
    // 2027 (month index 5). Before that: no lines, no notes.
    const months = fundedMonths(familyOf({ dobMonth: '2026-01' }), testSchedule());
    expect(months[4]?.lines.some((l) => l.kind === 'funded-hours-deduction')).toBe(false);
    expect(months[4]?.lines.some((l) => l.kind === 'funding-note')).toBe(false);
    expect(months[5]?.lines.some((l) => l.kind === 'funded-hours-deduction')).toBe(true);
  });

  it('adds no cap note when the nursery cap exceeds the entitlement', () => {
    const s = testSchedule({
      fundingPolicy: { kind: 'hours-deduction', conditions: { maxFundedHoursPerWeek: 40 } },
    });
    const months = fundedMonths(familyOf({ dobMonth: '2024-01' }), s);
    const deduction = months[0]?.lines.find((l) => l.kind === 'funded-hours-deduction');
    expect(deduction?.amountPence).toBe(-57000);
    expect(deduction?.assumptions).toEqual([]);
  });
});
