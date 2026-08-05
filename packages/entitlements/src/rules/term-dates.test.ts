import { isoMonth } from '@lemonhead/schemas';
import { describe, expect, it } from 'vitest';

import { firstTermStartAfter } from './term-dates.ts';

const TERMS = [1, 4, 9];

describe('firstTermStartAfter', () => {
  it.each([
    ['2025-08', '2025-09'],
    ['2025-09', '2026-01'],
    ['2025-12', '2026-01'],
    ['2026-01', '2026-04'],
    ['2026-03', '2026-04'],
    ['2026-04', '2026-09'],
    ['2026-06', '2026-09'],
  ])('qualifying month %s starts funding %s', (qualifying, expected) => {
    expect(firstTermStartAfter(isoMonth(qualifying), TERMS)).toBe(expected);
  });

  it('a birthday in a term-start month rolls to the next term', () => {
    expect(firstTermStartAfter(isoMonth('2027-09'), TERMS)).toBe('2028-01');
  });

  it('throws on a misconfigured empty term list', () => {
    expect(() => firstTermStartAfter(isoMonth('2026-08'), [])).toThrow(RangeError);
  });
});
