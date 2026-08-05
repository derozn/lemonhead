import { ucHouseholdTwoChildren, perDayHoursDeduction } from '@lemonhead/schemas/fixtures';
import { beforeEach, describe, expect, it } from 'vitest';

import { clearAll, loadFamily, loadNursery, saveFamily, saveNursery } from './storage.ts';

describe('storage', () => {
  beforeEach(() => {
    clearAll();
  });

  it('round-trips a nursery through localStorage', () => {
    saveNursery(perDayHoursDeduction);
    expect(loadNursery()).toEqual(perDayHoursDeduction);
  });

  it('returns null for a corrupted stored nursery', () => {
    localStorage.setItem('lemonhead:nursery', '{"nope": true}');
    expect(loadNursery()).toBeNull();
  });

  it('provably never writes the UC money figures (NFR5 amendment, ADR 0007)', () => {
    saveFamily(ucHouseholdTwoChildren);
    const raw = Object.keys(localStorage)
      .map((key) => localStorage.getItem(key))
      .join(' ');
    expect(raw).not.toContain('netMonthlyEarnings');
    expect(raw).not.toContain('currentMonthlyAward');
    expect(raw).not.toContain('145000');
    expect(raw).not.toContain('89600');
    const stored = loadFamily();
    expect(stored?.receivesUniversalCredit).toBe(true);
    expect(stored?.children).toHaveLength(2);
  });

  it('returns null family when nothing is stored', () => {
    expect(loadFamily()).toBeNull();
  });
});
