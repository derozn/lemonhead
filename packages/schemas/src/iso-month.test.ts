import { describe, expect, it } from 'vitest';

import {
  IsoDate,
  IsoMonth,
  addMonths,
  ageInMonths,
  compareIsoMonths,
  isoDate,
  isoMonth,
  monthOf,
  monthsBetween,
} from './iso-month.ts';

describe('IsoMonth', () => {
  it('accepts YYYY-MM strings', () => {
    expect(IsoMonth.parse('2026-08')).toBe('2026-08');
    expect(IsoMonth.parse('1999-01')).toBe('1999-01');
    expect(IsoMonth.parse('2026-12')).toBe('2026-12');
  });

  it.each(['2026-13', '2026-00', '2026-8', '202608', '2026-08-01', '', '26-08'])(
    'rejects %j with a format message',
    (bad) => {
      const result = IsoMonth.safeParse(bad);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        'Expected a month in YYYY-MM form, e.g. 2026-08',
      );
    },
  );

  it('rejects non-strings', () => {
    expect(IsoMonth.safeParse(202608).success).toBe(false);
  });
});

describe('month arithmetic', () => {
  it('adds months across year boundaries in both directions', () => {
    expect(addMonths(isoMonth('2025-11'), 3)).toBe('2026-02');
    expect(addMonths(isoMonth('2026-01'), -2)).toBe('2025-11');
    expect(addMonths(isoMonth('2026-08'), 0)).toBe('2026-08');
    expect(addMonths(isoMonth('2026-08'), 12)).toBe('2027-08');
  });

  it('refuses fractional month counts', () => {
    expect(() => addMonths(isoMonth('2026-08'), 1.5)).toThrow(RangeError);
  });

  it('measures signed distances between months', () => {
    expect(monthsBetween(isoMonth('2024-11'), isoMonth('2026-08'))).toBe(21);
    expect(monthsBetween(isoMonth('2026-08'), isoMonth('2024-11'))).toBe(-21);
    expect(monthsBetween(isoMonth('2026-08'), isoMonth('2026-08'))).toBe(0);
  });

  it('round-trips addMonths and monthsBetween', () => {
    const from = isoMonth('2024-03');
    const to = isoMonth('2027-01');
    expect(addMonths(from, monthsBetween(from, to))).toBe(to);
  });

  it('computes a child age in whole months, negative before birth', () => {
    expect(ageInMonths(isoMonth('2024-11'), isoMonth('2026-08'))).toBe(21);
    expect(ageInMonths(isoMonth('2026-10'), isoMonth('2026-08'))).toBe(-2);
  });

  it('validates IsoDate and extracts its month', () => {
    expect(isoDate('2026-04-06')).toBe('2026-04-06');
    expect(monthOf(isoDate('2026-04-06'))).toBe('2026-04');
    for (const bad of ['2026-04-32', '2026-04', '2026-4-06', '2026-13-01']) {
      expect(IsoDate.safeParse(bad).success).toBe(false);
    }
    expect(isoDate('2026-04-06') <= isoDate('2026-04-07')).toBe(true);
  });

  it('compares months chronologically', () => {
    const months = [isoMonth('2026-08'), isoMonth('2024-12'), isoMonth('2025-06')];
    const sorted = [...months].sort(compareIsoMonths);
    expect(sorted).toEqual([isoMonth('2024-12'), isoMonth('2025-06'), isoMonth('2026-08')]);
  });
});
