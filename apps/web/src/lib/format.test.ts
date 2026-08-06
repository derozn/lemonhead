import { describe, expect, it } from 'vitest';

import { penceToInputString, renderAmounts, toPence } from './format.ts';

describe('renderAmounts', () => {
  it('renders a four-figure amount with Intl grouping', () => {
    expect(renderAmounts('85% of your childcare costs, up to {cap} a month', { cap: 183616 })).toBe(
      '85% of your childcare costs, up to £1,836.16 a month',
    );
  });

  it('replaces every known placeholder in the text', () => {
    expect(
      renderAmounts('{topUp} added for every {payIn} you pay in', { topUp: 200, payIn: 800 }),
    ).toBe('£2.00 added for every £8.00 you pay in');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(renderAmounts('up to {cap} a month', { other: 100 })).toBe('up to {cap} a month');
  });

  it('returns the text unchanged when there is no amounts map', () => {
    expect(renderAmounts('up to {cap} a month')).toBe('up to {cap} a month');
  });
});

describe('penceToInputString', () => {
  it('round-trips through toPence', () => {
    for (const pence of [0, 1, 99, 100, 107109, 183616]) {
      expect(toPence(penceToInputString(pence))).toBe(pence);
    }
  });

  it('produces a plain two-decimal string with no symbol or grouping', () => {
    expect(penceToInputString(107109)).toBe('1071.09');
    expect(penceToInputString(1000)).toBe('10.00');
  });
});
