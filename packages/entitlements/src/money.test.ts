import { Pence } from '@lemonhead/schemas';
import { describe, expect, it } from 'vitest';

import { applyPercent, multiplyRate, negate, proRata, sumPence } from './money.ts';

const p = (value: number) => Pence.parse(value);

describe('money helpers', () => {
  it('sums to whole pence and rejects fractional inputs at the boundary', () => {
    expect(sumPence([100, 250, -50])).toBe(300);
    expect(sumPence([])).toBe(0);
    expect(() => sumPence([1.5])).toThrow();
  });

  it('applies percentages with a single half-up rounding', () => {
    expect(applyPercent(p(129625), 5)).toBe(6481); // 6481.25 rounds down
    expect(applyPercent(p(1), 50)).toBe(1); // 0.5 rounds up
    expect(applyPercent(p(10000), 85)).toBe(8500);
    expect(applyPercent(p(0), 20)).toBe(0);
  });

  it('multiplies rates by dyadic quantities exactly', () => {
    expect(multiplyRate(p(7800), 10.5)).toBe(81900);
    expect(multiplyRate(p(850), 16)).toBe(13600);
    expect(multiplyRate(p(400), 2)).toBe(800);
  });

  it('pro-rates with a single half-up rounding', () => {
    expect(proRata(p(516800), 1, 12)).toBe(43067); // 43066.67 rounds up
    expect(proRata(p(889200), 1, 12)).toBe(74100); // exact
    expect(proRata(p(23400), 38, 12)).toBe(74100);
    expect(proRata(p(5000), 3, 12)).toBe(1250);
  });

  it('negates for discount and deduction lines', () => {
    expect(negate(p(6800))).toBe(-6800);
    expect(negate(p(0))).toBe(0);
  });
});
