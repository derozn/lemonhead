import { AgeBandId, FeeSchedule, isoMonth, NonNegativePence, SessionId } from '@lemonhead/schemas';
import type { FamilyProfile } from '@lemonhead/schemas';
import {
  familyOf,
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
} from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { calculateGross, weeklyCostFor } from './gross.ts';
import { buildTimeline } from './timeline.ts';

function grossFor(profile: FamilyProfile, schedule: FeeSchedule, start = '2026-08') {
  return calculateGross(schedule, buildTimeline(profile, schedule, isoMonth(start)));
}

describe('Sunny Bank (per-day, covering session, band transition)', () => {
  // Full day 10.5h covers the requested 10h: £78.00 × 3 days = £234.00/week.
  // Term-time: 23400 × 38 / 12 = 74100 (£741.00/month) in Babies (0-24).
  // Toddlers from 2026-11 (age 24): 7200 × 3 × 38 / 12 = 68400 (£684.00).
  // Month 1 adds the £50 registration fee; the £200 deposit is shown but
  // excluded from totals as refundable.
  const months = grossFor(familyOf({ dobMonth: '2024-11' }), perDayHoursDeduction);

  it('matches the hand-computed monthly totals to the penny', () => {
    expect(months.map((m) => m.totalPence)).toEqual([
      79100, 74100, 74100, 68400, 68400, 68400, 68400, 68400, 68400, 68400, 68400, 68400,
    ]);
  });

  it('states the covering-session assumption on the fee line', () => {
    const feeLine = months[0]?.lines.find((line) => line.kind === 'gross-fees');
    expect(feeLine?.amountPence).toBe(74100);
    expect(feeLine?.sessionId).toBe('full-day');
    expect(feeLine?.assumptions[0]).toContain('10.5h');
  });

  it('shows the refundable deposit without counting it', () => {
    const deposit = months[0]?.lines.find((line) => line.description.startsWith('Deposit'));
    expect(deposit?.amountPence).toBe(20000);
    expect(deposit?.excludedFromTotal).toBe(true);
    expect(months[1]?.lines.find((line) => line.kind === 'extra')).toBeUndefined();
  });
});

describe('Little Acorns (hourly pricing, per-day extra, band transition)', () => {
  // Hourly: £8.50 × 8h × 2 days = £136.00/week → 516800/12 = 43066.67 → 43067.
  // Lunch £4.00 × 2 days × 38 / 12 = 30400/12 = 2533.33 → 2533.
  // Over-3s from 2027-01 (age 36): £7.90 × 16 × 38 / 12 = 40026.67 → 40027.
  const months = grossFor(
    familyOf({ dobMonth: '2024-01', daysPerWeek: 2, hoursPerDay: 8 }),
    perHourConditionalFunding,
  );

  it('matches the hand-computed monthly totals to the penny', () => {
    expect(months[0]?.totalPence).toBe(45600); // 43067 + 2533
    expect(months[4]?.totalPence).toBe(45600); // still under-3 in December
    expect(months[5]?.totalPence).toBe(42560); // 40027 + 2533 from January
    expect(months[11]?.totalPence).toBe(42560);
  });

  it('uses the hourly session with no assumptions', () => {
    const feeLine = months[0]?.lines.find((line) => line.kind === 'gross-fees');
    expect(feeLine?.sessionId).toBe('hourly');
    expect(feeLine?.assumptions).toEqual([]);
  });
});

describe('The Orchard (exact session, stretched year, sibling discount)', () => {
  // Exact 10h day session. Twos: £64.00 × 5 days × 51 / 12 = 136000 (£1,360).
  // Preschool: £61.00 × 5 × 51 / 12 = 129625. Younger child moves up 2027-06.
  // 5% second-and-subsequent lands on the younger child: 6800, then 6481.
  const months = grossFor(
    familyOf(
      { dobMonth: '2024-06', daysPerWeek: 5, pattern: 'stretched-all-year' },
      { dobMonth: '2022-09', daysPerWeek: 5, pattern: 'stretched-all-year' },
    ),
    fundedRateDeduction,
  );

  it('matches the hand-computed monthly totals to the penny', () => {
    expect(months[0]?.totalPence).toBe(258825); // 136000 + 129625 - 6800
    expect(months[9]?.totalPence).toBe(258825);
    expect(months[10]?.totalPence).toBe(252769); // both preschool: 2×129625 - 6481
    expect(months[11]?.totalPence).toBe(252769);
  });

  it('applies the discount to the younger child and notes the 51-week assumption', () => {
    const discount = months[0]?.lines.find((line) => line.kind === 'sibling-discount');
    expect(discount?.childIndex).toBe(0);
    expect(discount?.amountPence).toBe(-6800);
    const feeLine = months[0]?.lines.find((line) => line.kind === 'gross-fees');
    expect(feeLine?.assumptions[0]).toContain('51 weeks');
  });

  it('exact-hours sessions carry no booking assumption in weeklyCostFor', () => {
    const weekly = weeklyCostFor(fundedRateDeduction, AgeBandId.parse('twos'), {
      daysPerWeek: 5,
      hoursPerDay: 10,
      pattern: 'stretched-all-year',
    });
    expect(weekly?.pence).toBe(32000);
    expect(weekly?.assumption).toBeUndefined();
  });
});

describe('oldest-child discounts and open-ended bands', () => {
  it('targets the oldest child regardless of profile order', () => {
    // Older child first: preschool 6900 × 3 × 38/12 = 65550; babies 74100.
    // 10% oldest-child discount: -6555. Registration £50 per child in month 1.
    const months = grossFor(
      familyOf({ dobMonth: '2022-01' }, { dobMonth: '2024-11' }),
      perDayHoursDeduction,
    );
    expect(months[0]?.totalPence).toBe(143095); // 65550 + 74100 - 6555 + 5000 + 5000
    const discount = months[0]?.lines.find((line) => line.kind === 'sibling-discount');
    expect(discount?.childIndex).toBe(0);
    expect(discount?.amountPence).toBe(-6555);
  });

  it('applies no discount in months with one attending child', () => {
    const months = grossFor(familyOf({ dobMonth: '2024-11' }), perDayHoursDeduction);
    expect(months.flatMap((m) => m.lines).find((l) => l.kind === 'sibling-discount')).toBe(
      undefined,
    );
  });
});

function schedule(overrides: Record<string, unknown> = {}): FeeSchedule {
  return FeeSchedule.parse({
    nursery: { name: 'Test Nursery', source: 'manual-entry' },
    ageBands: [{ id: 'all', label: 'All ages', fromMonths: 0, toMonths: 72 }],
    sessions: [{ id: 'day', kind: 'full-day', label: 'Day', hours: 10 }],
    prices: [{ ageBandId: 'all', sessionId: 'day', rate: 6000 }],
    discounts: [],
    extras: [],
    fundingPolicy: { kind: 'unknown' },
    attendancePatterns: ['term-time-38'],
    ...overrides,
  });
}

const ALL_BAND = AgeBandId.parse('all');

describe('session selection edge paths', () => {
  it('books the smallest covering session among several', () => {
    const s = schedule({
      sessions: [
        { id: 'six', kind: 'half-day', label: 'Six hours', hours: 6 },
        { id: 'eight', kind: 'full-day', label: 'Eight hours', hours: 8 },
      ],
      prices: [
        { ageBandId: 'all', sessionId: 'six', rate: 4000 },
        { ageBandId: 'all', sessionId: 'eight', rate: 5000 },
      ],
    });
    const weekly = weeklyCostFor(s, ALL_BAND, {
      daysPerWeek: 2,
      hoursPerDay: 5.5,
      pattern: 'term-time-38',
    });
    expect(weekly?.sessionId).toBe('six');
    expect(weekly?.pence).toBe(8000);
    expect(weekly?.assumption).toContain('no shorter session');
  });

  it('uses a weekly rate, flagging when requested hours exceed it', () => {
    const s = schedule({
      sessions: [{ id: 'wk', kind: 'weekly', label: 'Weekly place', hours: 50 }],
      prices: [{ ageBandId: 'all', sessionId: 'wk', rate: 30000 }],
    });
    const over = weeklyCostFor(s, ALL_BAND, {
      daysPerWeek: 5,
      hoursPerDay: 11,
      pattern: 'term-time-38',
    });
    expect(over?.pence).toBe(30000);
    expect(over?.assumption).toContain('55h');
    const within = weeklyCostFor(s, ALL_BAND, {
      daysPerWeek: 4,
      hoursPerDay: 10,
      pattern: 'term-time-38',
    });
    expect(within?.assumption).toBeUndefined();
  });

  it('falls back to the longest session when nothing covers the day', () => {
    const s = schedule({
      sessions: [
        { id: 'short', kind: 'half-day', label: 'Short', hours: 4 },
        { id: 'medium', kind: 'half-day', label: 'Medium', hours: 5 },
      ],
      prices: [
        { ageBandId: 'all', sessionId: 'short', rate: 2500 },
        { ageBandId: 'all', sessionId: 'medium', rate: 3000 },
      ],
    });
    const weekly = weeklyCostFor(s, ALL_BAND, {
      daysPerWeek: 3,
      hoursPerDay: 9,
      pattern: 'term-time-38',
    });
    expect(weekly?.sessionId).toBe('medium');
    expect(weekly?.assumption).toContain('shorter than');
  });

  it('flags a band with no prices as an unknown-flag £0 line', () => {
    const s = schedule({
      ageBands: [
        { id: 'all', label: 'All ages', fromMonths: 0, toMonths: 36 },
        { id: 'older', label: 'Older', fromMonths: 36, toMonths: 72 },
      ],
    });
    const months = grossFor(familyOf({ dobMonth: '2022-01' }), s);
    const flagged = months[0]?.lines.find((line) => line.kind === 'unknown-flag');
    expect(flagged?.amountPence).toBe(0);
    expect(flagged?.assumptions[0]).toContain('no priced session');
    expect(months[0]?.totalPence).toBe(0);
  });

  it('survives a price pointing at a session that does not exist', () => {
    // Type-level FeeSchedule cannot encode referential integrity; the parse
    // refinement catches it, but the engine stays defensive regardless.
    const inconsistent: FeeSchedule = {
      ...schedule(),
      prices: [
        {
          ageBandId: ALL_BAND,
          sessionId: SessionId.parse('ghost'),
          rate: NonNegativePence.parse(6000),
        },
      ],
    };
    const weekly = weeklyCostFor(inconsistent, ALL_BAND, {
      daysPerWeek: 3,
      hoursPerDay: 10,
      pattern: 'term-time-38',
    });
    expect(weekly).toBeUndefined();
  });
});

describe('extras cadences and late starters', () => {
  it('annualises week, month, term, and year extras', () => {
    const s = schedule({
      extras: [
        { label: 'Milk', amount: 1200, per: 'week', refundable: false },
        { label: 'Fund', amount: 500, per: 'month', refundable: false },
        { label: 'Trips', amount: 3000, per: 'term', refundable: false },
        { label: 'Membership', amount: 2400, per: 'year', refundable: false },
      ],
    });
    const months = grossFor(familyOf({ dobMonth: '2024-01' }), s);
    const byLabel = (label: string) =>
      months[3]?.lines.find((line) => line.description.startsWith(label))?.amountPence;
    expect(byLabel('Milk')).toBe(3800); // 1200 × 38 / 12
    expect(byLabel('Fund')).toBe(500);
    expect(byLabel('Trips')).toBe(750); // 3000 × 3 / 12
    expect(byLabel('Membership')).toBe(200); // 2400 / 12
  });

  it('charges a one-off in the first month a late-starting child attends', () => {
    const s = schedule({
      ageBands: [{ id: 'all', label: 'All ages', fromMonths: 9, toMonths: 72 }],
      extras: [{ label: 'Registration', amount: 5000, per: 'one-off', refundable: false }],
    });
    // Born 2026-06: reaches 9 months (band start) in 2027-03, month index 7.
    const months = grossFor(familyOf({ dobMonth: '2026-06' }), s);
    expect(months[0]?.totalPence).toBe(0);
    expect(months[0]?.lines).toHaveLength(0);
    const startMonth = months[7];
    expect(startMonth?.lines.find((line) => line.kind === 'extra')?.amountPence).toBe(5000);
    expect(months[8]?.lines.find((line) => line.kind === 'extra')).toBeUndefined();
  });

  it('notes when the family pattern is not one the nursery lists', () => {
    const months = grossFor(
      familyOf({ dobMonth: '2024-01', pattern: 'stretched-all-year' }),
      perHourConditionalFunding, // lists term-time-38 only
    );
    const feeLine = months[0]?.lines.find((line) => line.kind === 'gross-fees');
    expect(feeLine?.assumptions.join(' ')).toContain('does not list this attendance pattern');
  });

  it('applies an all-children discount to every attending child', () => {
    const s = schedule({
      discounts: [{ percentOff: 10, appliesTo: 'all-children' }],
    });
    const months = grossFor(familyOf({ dobMonth: '2024-01' }, { dobMonth: '2022-05' }), s);
    const discounts = months[0]?.lines.filter((line) => line.kind === 'sibling-discount');
    expect(discounts).toHaveLength(2);
  });
});
