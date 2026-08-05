import { describe, expect, it } from 'vitest';

import { AgeBand, FeeSchedule } from './fee-schedule.ts';
import {
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
} from './fixtures/nurseries.ts';

const fixtures = [perDayHoursDeduction, perHourConditionalFunding, fundedRateDeduction];

function messagesOf(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe('FeeSchedule fixtures', () => {
  it('all fixtures parse and round-trip unchanged', () => {
    for (const fixture of fixtures) {
      expect(FeeSchedule.parse(fixture)).toEqual(fixture);
    }
  });

  it('covers the three pricing/funding styles the task requires', () => {
    expect(perDayHoursDeduction.fundingPolicy.kind).toBe('hours-deduction');
    expect(perHourConditionalFunding.sessions[0]?.kind).toBe('hourly');
    expect(fundedRateDeduction.fundingPolicy.kind).toBe('funded-rate-deduction');
  });
});

describe('AgeBand', () => {
  it('rejects a band that ends before it starts', () => {
    const result = AgeBand.safeParse({ id: 'x', label: 'X', fromMonths: 36, toMonths: 24 });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain(
      'An age band must end after it starts (fromMonths < toMonths)',
    );
  });

  it('rejects fractional month boundaries', () => {
    const result = AgeBand.safeParse({ id: 'x', label: 'X', fromMonths: 0.5, toMonths: 24 });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Age band boundaries are whole months');
  });
});

describe('FeeSchedule cross-validation', () => {
  it('rejects overlapping age bands, naming the pair', () => {
    const result = FeeSchedule.safeParse({
      ...perDayHoursDeduction,
      ageBands: [
        { id: 'babies', label: 'Babies', fromMonths: 0, toMonths: 30 },
        { id: 'toddlers', label: 'Toddlers', fromMonths: 24, toMonths: 36 },
      ],
      prices: [{ ageBandId: 'babies', sessionId: 'full-day', rate: 7800 }],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain(
      'Age bands "babies" and "toddlers" overlap; bands must not share months',
    );
  });

  it('rejects an open-ended band that is not the oldest', () => {
    const result = FeeSchedule.safeParse({
      ...perDayHoursDeduction,
      ageBands: [
        { id: 'babies', label: 'Babies', fromMonths: 0 },
        { id: 'toddlers', label: 'Toddlers', fromMonths: 24, toMonths: 36 },
      ],
      prices: [{ ageBandId: 'babies', sessionId: 'full-day', rate: 7800 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate band and session ids', () => {
    const result = FeeSchedule.safeParse({
      ...perHourConditionalFunding,
      ageBands: [
        { id: 'under-3', label: 'A', fromMonths: 9, toMonths: 36 },
        { id: 'under-3', label: 'B', fromMonths: 36, toMonths: 60 },
      ],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Duplicate age band id "under-3"');
  });

  it('rejects prices pointing at unknown bands or sessions', () => {
    const result = FeeSchedule.safeParse({
      ...perHourConditionalFunding,
      prices: [{ ageBandId: 'made-up', sessionId: 'also-made-up', rate: 800 }],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Price refers to unknown age band "made-up"');
    expect(messagesOf(result)).toContain('Price refers to unknown session "also-made-up"');
  });

  it('rejects two prices for the same band and session', () => {
    const result = FeeSchedule.safeParse({
      ...perHourConditionalFunding,
      prices: [
        { ageBandId: 'under-3', sessionId: 'hourly', rate: 850 },
        { ageBandId: 'under-3', sessionId: 'hourly', rate: 900 },
      ],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain(
      'More than one price for age band "under-3" and session "hourly"',
    );
  });

  it('rejects negative rates with the money message', () => {
    const result = FeeSchedule.safeParse({
      ...perHourConditionalFunding,
      prices: [{ ageBandId: 'under-3', sessionId: 'hourly', rate: -850 }],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('This amount cannot be negative');
  });

  it('rejects a funded-rate policy without its rate', () => {
    const result = FeeSchedule.safeParse({
      ...fundedRateDeduction,
      fundingPolicy: { kind: 'funded-rate-deduction' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects funding restrictions naming unknown sessions', () => {
    const result = FeeSchedule.safeParse({
      ...perHourConditionalFunding,
      fundingPolicy: {
        kind: 'hours-deduction',
        conditions: { restrictedToSessionIds: ['weekend-club'] },
      },
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain(
      'Funding restriction names unknown session "weekend-club"',
    );
  });

  it('rejects allocated funded sessions that are not defined sessions', () => {
    const result = FeeSchedule.safeParse({
      ...perDayHoursDeduction,
      fundingPolicy: { kind: 'sessions-allocated', fundedSessionIds: ['nonexistent'] },
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Funded session "nonexistent" is not a defined session');
  });

  it('accepts the honest unknown policy and not-offered', () => {
    for (const fundingPolicy of [{ kind: 'unknown' }, { kind: 'not-offered' }]) {
      expect(FeeSchedule.safeParse({ ...perDayHoursDeduction, fundingPolicy }).success).toBe(true);
    }
  });

  it('rejects session hours off the quarter-hour grid', () => {
    const result = FeeSchedule.safeParse({
      ...perHourConditionalFunding,
      sessions: [{ id: 'hourly', kind: 'hourly', label: 'Per hour', hours: 1.1 }],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Session hours are in quarter-hour steps');
  });

  it('rejects empty bands, sessions, prices, and patterns', () => {
    expect(messagesOf(FeeSchedule.safeParse({ ...perDayHoursDeduction, ageBands: [] }))).toContain(
      'A fee schedule needs at least one age band',
    );
    expect(messagesOf(FeeSchedule.safeParse({ ...perDayHoursDeduction, sessions: [] }))).toContain(
      'A fee schedule needs at least one session type',
    );
    expect(messagesOf(FeeSchedule.safeParse({ ...perDayHoursDeduction, prices: [] }))).toContain(
      'A fee schedule needs at least one price',
    );
    expect(
      messagesOf(FeeSchedule.safeParse({ ...perDayHoursDeduction, attendancePatterns: [] })),
    ).toContain('State at least one attendance pattern the nursery offers');
  });

  it('rejects duplicate attendance patterns', () => {
    const result = FeeSchedule.safeParse({
      ...perDayHoursDeduction,
      attendancePatterns: ['term-time-38', 'term-time-38'],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Attendance pattern "term-time-38" is listed twice');
  });

  it('rejects discounts outside (0, 100]', () => {
    for (const percentOff of [0, 101, -5]) {
      const result = FeeSchedule.safeParse({
        ...perDayHoursDeduction,
        discounts: [{ percentOff, appliesTo: 'oldest-child' }],
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects malformed outward postcodes', () => {
    const result = FeeSchedule.safeParse({
      ...perDayHoursDeduction,
      nursery: { name: 'X', postcodeArea: 'SE15 4AB', source: 'manual-entry' },
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain('Expected an outward postcode like SE15 or M1');
  });
});
