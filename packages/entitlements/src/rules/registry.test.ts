import { isoDate } from '@lemonhead/schemas';
import { describe, expect, it } from 'vitest';

import { latestEffective, resolveRuleSet } from './registry.ts';

describe('resolveRuleSet', () => {
  it('resolves the April 2026 composite for a current date', () => {
    const ruleSet = resolveRuleSet(isoDate('2026-08-05'));
    expect(ruleSet.id).toBe('england/funded-hours@2026-04-06+tfc@2026-04-06+uc@2026-04-06');
    expect(ruleSet.jurisdiction).toBe('england');
    expect(ruleSet.fundedHours.workingParent.hoursPerWeek).toBe(30);
    expect(ruleSet.taxFreeChildcare.quarterlyCapPence).toBe(50000);
    expect(ruleSet.universalCredit.childcare.monthlyCapOneChildPence).toBe(107109);
  });

  it('resolves identically with the jurisdiction stated explicitly', () => {
    expect(resolveRuleSet(isoDate('2026-08-05'), 'england')).toEqual(
      resolveRuleSet(isoDate('2026-08-05')),
    );
  });

  it('resolves on the exact effective date', () => {
    expect(resolveRuleSet(isoDate('2026-04-06')).id).toContain('funded-hours@2026-04-06');
  });

  it('refuses dates before the earliest encoded parameters', () => {
    expect(() => resolveRuleSet(isoDate('2026-04-05'))).toThrow(RangeError);
    expect(() => resolveRuleSet(isoDate('2025-09-01'))).toThrow(
      /No funded-hours rule parameters in force on 2025-09-01/,
    );
  });

  it('picks the latest in-force set when several are encoded', () => {
    const older = { effectiveFrom: isoDate('2025-09-01') };
    const newer = { effectiveFrom: isoDate('2026-04-06') };
    const future = { effectiveFrom: isoDate('2027-04-06') };
    expect(latestEffective([older, newer, future], isoDate('2026-08-05'), 'test')).toBe(newer);
    expect(latestEffective([newer, older], isoDate('2026-08-05'), 'test')).toBe(newer);
    expect(latestEffective([older, newer], isoDate('2025-12-01'), 'test')).toBe(older);
  });

  it('reports "(none encoded)" for an empty scheme', () => {
    expect(() => latestEffective([], isoDate('2026-08-05'), 'test')).toThrow(/none encoded/);
  });

  it('every scheme carries citations with retrieval dates', () => {
    const ruleSet = resolveRuleSet(isoDate('2026-08-05'));
    for (const scheme of [ruleSet.fundedHours, ruleSet.taxFreeChildcare, ruleSet.universalCredit]) {
      expect(scheme.sources.length).toBeGreaterThan(0);
      for (const source of scheme.sources) {
        expect(source.url).toMatch(
          /^https:\/\/(www\.gov\.uk|assets\.publishing\.service\.gov\.uk)/,
        );
        expect(source.quote.length).toBeGreaterThan(10);
        expect(source.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
