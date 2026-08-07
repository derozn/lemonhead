import { FeeSchedule } from '@lemonhead/schemas';
import {
  fundedRateDeduction,
  perDayHoursDeduction,
  ucHouseholdTwoChildren,
} from '@lemonhead/schemas/fixtures';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearAll,
  deleteNursery,
  getActiveNurseryName,
  listNurseries,
  loadFamily,
  nurseryNameTaken,
  saveFamily,
  saveNursery,
  setActiveNursery,
} from './storage.ts';

describe('storage', () => {
  beforeEach(() => {
    clearAll();
  });

  it('round-trips a nursery through the list and makes it active', () => {
    saveNursery(perDayHoursDeduction);
    expect(listNurseries()).toEqual([perDayHoursDeduction]);
    expect(getActiveNurseryName()).toBe(perDayHoursDeduction.nursery.name);
  });

  it('upserts by nursery name instead of duplicating', () => {
    saveNursery(perDayHoursDeduction);
    const cheaper = FeeSchedule.parse({
      ...perDayHoursDeduction,
      extras: [],
    });
    saveNursery(cheaper);
    expect(listNurseries()).toEqual([cheaper]);
  });

  it('replaces the named entry on a rename, leaving no duplicate behind', () => {
    saveNursery(perDayHoursDeduction);
    const renamed = FeeSchedule.parse({
      ...perDayHoursDeduction,
      nursery: { ...perDayHoursDeduction.nursery, name: 'Sunny Bank (new site)' },
    });
    expect(saveNursery(renamed, perDayHoursDeduction.nursery.name)).toBe(true);
    expect(listNurseries()).toEqual([renamed]);
    expect(getActiveNurseryName()).toBe('Sunny Bank (new site)');
  });

  it('refuses a rename onto a name that belongs to a different nursery', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    const collided = FeeSchedule.parse({
      ...perDayHoursDeduction,
      nursery: { ...perDayHoursDeduction.nursery, name: fundedRateDeduction.nursery.name },
    });
    expect(saveNursery(collided, perDayHoursDeduction.nursery.name)).toBe(false);
    // Both entries survive untouched; a shared name would make deleteNursery
    // remove them together.
    expect(listNurseries()).toEqual([perDayHoursDeduction, fundedRateDeduction]);
    expect(getActiveNurseryName()).toBe(fundedRateDeduction.nursery.name);
  });

  it('reports whether a name is taken, excluding the entry being edited', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    expect(nurseryNameTaken(perDayHoursDeduction.nursery.name)).toBe(true);
    expect(nurseryNameTaken('Somewhere Unsaved')).toBe(false);
    // Keeping your own name during an edit is not a collision.
    expect(
      nurseryNameTaken(perDayHoursDeduction.nursery.name, perDayHoursDeduction.nursery.name),
    ).toBe(false);
  });

  it('migrates a legacy single nursery into the list with no data loss', () => {
    localStorage.setItem('lemonhead:nursery', JSON.stringify(perDayHoursDeduction));
    expect(listNurseries()).toEqual([perDayHoursDeduction]);
    expect(localStorage.getItem('lemonhead:nursery')).toBeNull();
    expect(getActiveNurseryName()).toBe(perDayHoursDeduction.nursery.name);
    // A second read must not duplicate the migrated entry.
    expect(listNurseries()).toHaveLength(1);
  });

  it('keeps an existing active pointer through a legacy migration', () => {
    saveNursery(fundedRateDeduction);
    localStorage.setItem('lemonhead:nursery', JSON.stringify(perDayHoursDeduction));
    expect(listNurseries()).toEqual([fundedRateDeduction, perDayHoursDeduction]);
    expect(getActiveNurseryName()).toBe(fundedRateDeduction.nursery.name);
  });

  it('drops a corrupted legacy nursery instead of migrating it', () => {
    localStorage.setItem('lemonhead:nursery', '{"nope": true}');
    expect(listNurseries()).toEqual([]);
    expect(localStorage.getItem('lemonhead:nursery')).toBeNull();
  });

  it('drops a legacy value that is not JSON at all, without throwing', () => {
    localStorage.setItem('lemonhead:nursery', 'not json {');
    expect(listNurseries()).toEqual([]);
    expect(localStorage.getItem('lemonhead:nursery')).toBeNull();
  });

  it('returns an empty list for a corrupted stored list', () => {
    localStorage.setItem('lemonhead:nurseries', '{"nope": true}');
    expect(listNurseries()).toEqual([]);
  });

  it('returns an empty list for a stored list that is not JSON at all', () => {
    localStorage.setItem('lemonhead:nurseries', '<<<definitely not json>>>');
    expect(listNurseries()).toEqual([]);
  });

  it('returns null family for a stored value that is not JSON at all', () => {
    localStorage.setItem('lemonhead:family', 'not json {');
    expect(loadFamily()).toBeNull();
  });

  it('deletes a nursery and moves the active pointer to a survivor', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    expect(getActiveNurseryName()).toBe(fundedRateDeduction.nursery.name);
    deleteNursery(fundedRateDeduction.nursery.name);
    expect(listNurseries()).toEqual([perDayHoursDeduction]);
    expect(getActiveNurseryName()).toBe(perDayHoursDeduction.nursery.name);
    deleteNursery(perDayHoursDeduction.nursery.name);
    expect(listNurseries()).toEqual([]);
    expect(getActiveNurseryName()).toBeNull();
  });

  it('keeps the active pointer when deleting an inactive nursery', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    deleteNursery(perDayHoursDeduction.nursery.name);
    expect(getActiveNurseryName()).toBe(fundedRateDeduction.nursery.name);
  });

  it('lets the active pointer be set directly', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    setActiveNursery(perDayHoursDeduction.nursery.name);
    expect(getActiveNurseryName()).toBe(perDayHoursDeduction.nursery.name);
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

  it('still never writes UC money figures with multiple nurseries saved', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    saveFamily(ucHouseholdTwoChildren);
    expect(listNurseries()).toHaveLength(2);
    const raw = Object.keys(localStorage)
      .map((key) => localStorage.getItem(key))
      .join(' ');
    expect(raw).not.toContain('netMonthlyEarnings');
    expect(raw).not.toContain('currentMonthlyAward');
    expect(raw).not.toContain('145000');
    expect(raw).not.toContain('89600');
  });

  it('returns null family when nothing is stored', () => {
    expect(loadFamily()).toBeNull();
  });
});
