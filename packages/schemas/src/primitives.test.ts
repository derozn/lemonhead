import { describe, expect, it } from 'vitest';

import { NonNegativePence, Pence, YesNoUnsure, pence } from './primitives.ts';

describe('Pence', () => {
  it('accepts whole pence including zero and negatives', () => {
    expect(Pence.parse(0)).toBe(0);
    expect(Pence.parse(123456)).toBe(123456);
    expect(Pence.parse(-250)).toBe(-250);
  });

  it('rejects fractional amounts with a money-specific message', () => {
    const result = Pence.safeParse(12.5);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Money must be an integer number of pence, never a fractional amount',
    );
  });

  it('rejects non-numbers', () => {
    expect(Pence.safeParse('100').success).toBe(false);
    expect(Pence.safeParse(null).success).toBe(false);
    expect(Pence.safeParse(Number.NaN).success).toBe(false);
  });

  it('constructs via the pence() helper', () => {
    expect(pence(199)).toBe(199);
    expect(() => pence(1.99)).toThrow();
  });
});

describe('NonNegativePence', () => {
  it('accepts zero and positive amounts', () => {
    expect(NonNegativePence.parse(0)).toBe(0);
    expect(NonNegativePence.parse(85000)).toBe(85000);
  });

  it('rejects negative amounts with a useful message', () => {
    const result = NonNegativePence.safeParse(-1);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('This amount cannot be negative');
  });
});

describe('YesNoUnsure', () => {
  it('accepts exactly the three states', () => {
    expect(YesNoUnsure.parse('yes')).toBe('yes');
    expect(YesNoUnsure.parse('no')).toBe('no');
    expect(YesNoUnsure.parse('unsure')).toBe('unsure');
    expect(YesNoUnsure.safeParse('maybe').success).toBe(false);
    expect(YesNoUnsure.safeParse(true).success).toBe(false);
  });
});
