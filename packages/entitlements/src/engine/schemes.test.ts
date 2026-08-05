import type { FamilyProfile } from '@lemonhead/schemas';
import { FeeSchedule, isoMonth, UniversalCreditStatus } from '@lemonhead/schemas';
import {
  familyOf,
  perDayHoursDeduction,
  ucHouseholdTwoChildren,
} from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { fundedHoursEngland2026April } from '../rules/funded-hours/params/2026-04-06.england.ts';
import { taxFreeChildcare2026April } from '../rules/tax-free-childcare/params/2026-04-06.uk.ts';
import { universalCredit2026April } from '../rules/universal-credit/params/2026-04-06.uk.ts';

import { applyFunding } from './funding.ts';
import { calculateGross } from './gross.ts';
import { applyTfc } from './tax-free-childcare.ts';
import { buildTimeline } from './timeline.ts';
import { applyUc } from './universal-credit.ts';

const tfcParams = taxFreeChildcare2026April;
const ucParams = universalCredit2026April;

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

function grossMonths(profile: FamilyProfile, s: FeeSchedule) {
  const timeline = buildTimeline(profile, s, isoMonth('2026-08'));
  return { timeline, months: calculateGross(s, timeline) };
}

describe('applyTfc', () => {
  it('tops up 20% of an eligible child costs with citation and stated approximation', () => {
    // Gross 6000 × 3 × 38 / 12 = 57000; top-up 11400.
    const { timeline, months } = grossMonths(familyOf({ dobMonth: '2024-01' }), schedule());
    const result = applyTfc(familyOf({ dobMonth: '2024-01' }), tfcParams, timeline, months);
    const line = result[0]?.lines.find((l) => l.kind === 'tfc-top-up');
    expect(line?.amountPence).toBe(-11400);
    expect(line?.citation?.url).toContain('gov.uk');
    expect(line?.assumptions.join(' ')).toContain('calendar quarter');
    expect(result[0]?.totalPence).toBe(45600); // 57000 - 11400
  });

  it('caps the top-up per calendar quarter and resumes next quarter', () => {
    // Rate £300/day: gross 30000 × 3 × 38 / 12 = 285000; ideal top-up 57000.
    // Q3 has two horizon months (Aug, Sep): 50000 then 0. Q4: 50000, 0, 0.
    const s = schedule({ prices: [{ ageBandId: 'all', sessionId: 'day', rate: 30000 }] });
    const profile = familyOf({ dobMonth: '2024-01' });
    const { timeline, months } = grossMonths(profile, s);
    const result = applyTfc(profile, tfcParams, timeline, months);
    const topUps = result.map(
      (month) => month.lines.find((l) => l.kind === 'tfc-top-up')?.amountPence,
    );
    expect(topUps[0]).toBe(-50000); // August: cap reached
    expect(topUps[1]).toBeUndefined(); // September: quarter exhausted
    expect(topUps[2]).toBe(-50000); // October: new quarter
    expect(topUps[3]).toBeUndefined();
  });

  it('applies the higher quarterly cap for a disabled child', () => {
    const s = schedule({ prices: [{ ageBandId: 'all', sessionId: 'day', rate: 30000 }] });
    const profile = familyOf({ dobMonth: '2024-01', disabled: true });
    const { timeline, months } = grossMonths(profile, s);
    const result = applyTfc(profile, tfcParams, timeline, months);
    expect(result[0]?.lines.find((l) => l.kind === 'tfc-top-up')?.amountPence).toBe(-57000);
    // Remaining 100000 - 57000 = 43000 in September.
    expect(result[1]?.lines.find((l) => l.kind === 'tfc-top-up')?.amountPence).toBe(-43000);
  });

  it('emits an unconfirmed note for needs-info households instead of a number', () => {
    const unsure: FamilyProfile = {
      ...familyOf({ dobMonth: '2024-01' }),
      parents: {
        count: 2,
        allInPaidWork: 'yes',
        allMeetMinimumEarnings: 'unsure',
        anyOver100k: 'no',
      },
    };
    const { timeline, months } = grossMonths(unsure, schedule());
    const result = applyTfc(unsure, tfcParams, timeline, months);
    const line = result[0]?.lines.find((l) => l.kind === 'tfc-top-up');
    expect(line?.amountPence).toBe(0);
    expect(line?.description).toContain('unconfirmed');
    expect(result[0]?.totalPence).toBe(57000);
  });

  it('adds nothing for UC households (mutual exclusivity)', () => {
    const { timeline, months } = grossMonths(ucHouseholdTwoChildren, schedule());
    const result = applyTfc(ucHouseholdTwoChildren, tfcParams, timeline, months);
    expect(result.flatMap((m) => m.lines).some((l) => l.kind === 'tfc-top-up')).toBe(false);
  });

  it('skips months where a child has no cost', () => {
    const s = schedule({
      ageBands: [{ id: 'all', label: 'All ages', fromMonths: 9, toMonths: 72 }],
    });
    const late = familyOf({ dobMonth: '2026-06' }); // in band from 2027-03
    const { timeline, months } = grossMonths(late, s);
    const result = applyTfc(late, tfcParams, timeline, months);
    expect(result[0]?.lines.some((l) => l.kind === 'tfc-top-up')).toBe(false);
    expect(result[11]?.lines.some((l) => l.kind === 'tfc-top-up')).toBe(true);
  });

  it('refuses months misaligned with the timeline', () => {
    const profile = familyOf({ dobMonth: '2024-01' });
    const { timeline, months } = grossMonths(profile, schedule());
    expect(() => applyTfc(profile, tfcParams, timeline.slice(0, 1), months)).toThrow(RangeError);
  });
});

describe('applyUc', () => {
  it('signposts non-claimants in the first month only', () => {
    const profile = familyOf({ dobMonth: '2024-01' });
    const { months } = grossMonths(profile, schedule());
    const result = applyUc(profile, ucParams, months);
    const first = result[0]?.lines.find((l) => l.kind === 'uc-signpost');
    expect(first?.assumptions.join(' ')).toContain('benefits calculator');
    expect(result[1]?.lines.some((l) => l.kind === 'uc-signpost')).toBe(false);
  });

  it('computes the element for a working claimant household, cap-exempt', () => {
    // Fixture attendance: 5 × 8h and 2 × 6h, both stretched (51 weeks).
    // Covering day session: 6000 × 5 × 51/12 = 127500 and 6000 × 2 × 51/12
    // = 51000 → 178500 gross. Element: min(85% = 151725, cap 183616).
    const { months } = grossMonths(ucHouseholdTwoChildren, schedule());
    const result = applyUc(ucHouseholdTwoChildren, ucParams, months);
    const line = result[0]?.lines.find((l) => l.kind === 'uc-element');
    expect(line?.amountPence).toBe(-151725);
    expect(line?.assumptions.join(' ')).not.toContain('benefit cap may reduce');
    expect(result[0]?.totalPence).toBe(26775); // 178500 - 151725
  });

  it('caps the element at the one-child maximum', () => {
    // £2,000/day is absurd on purpose: 200000 × 3 × 38 / 12 = 1900000 gross;
    // 85% = 1615000, capped at 107109.
    const claimant: FamilyProfile = {
      ...familyOf({ dobMonth: '2024-01' }),
      universalCredit: UniversalCreditStatus.parse({
        receives: true,
        netMonthlyEarnings: 145000,
        currentMonthlyAward: 50000,
      }),
    };
    const s = schedule({ prices: [{ ageBandId: 'all', sessionId: 'day', rate: 200000 }] });
    const { months } = grossMonths(claimant, s);
    const line = applyUc(claimant, ucParams, months)[0]?.lines.find((l) => l.kind === 'uc-element');
    expect(line?.amountPence).toBe(-107109);
  });

  it('warns when earnings sit below the benefit-cap exemption threshold', () => {
    const claimant: FamilyProfile = {
      ...familyOf({ dobMonth: '2024-01' }),
      universalCredit: UniversalCreditStatus.parse({
        receives: true,
        netMonthlyEarnings: 80000,
        currentMonthlyAward: 50000,
      }),
    };
    const { months } = grossMonths(claimant, schedule());
    const line = applyUc(claimant, ucParams, months)[0]?.lines.find((l) => l.kind === 'uc-element');
    expect(line?.assumptions.join(' ')).toContain('benefit cap may reduce');
  });

  it('signposts instead of computing when the current award is £0', () => {
    const claimant: FamilyProfile = {
      ...familyOf({ dobMonth: '2024-01' }),
      universalCredit: UniversalCreditStatus.parse({
        receives: true,
        netMonthlyEarnings: 145000,
        currentMonthlyAward: 0,
      }),
    };
    const { months } = grossMonths(claimant, schedule());
    const result = applyUc(claimant, ucParams, months);
    const line = result[0]?.lines.find((l) => l.kind === 'uc-signpost');
    expect(line?.description).toContain('not computed');
    expect(line?.assumptions.join(' ')).toContain('taper');
    expect(result.flatMap((m) => m.lines).some((l) => l.kind === 'uc-element')).toBe(false);
  });

  it('reports needs-info when the paid-work answer is unsure', () => {
    const claimant: FamilyProfile = {
      ...ucHouseholdTwoChildren,
      parents: { ...ucHouseholdTwoChildren.parents, allInPaidWork: 'unsure' },
    };
    const { months } = grossMonths(claimant, schedule());
    const line = applyUc(claimant, ucParams, months)[0]?.lines.find(
      (l) => l.kind === 'uc-signpost',
    );
    expect(line?.description).toContain('unconfirmed');
  });

  it('adds no element to zero-cost months', () => {
    const claimant: FamilyProfile = {
      ...familyOf({ dobMonth: '2024-01' }),
      universalCredit: UniversalCreditStatus.parse({
        receives: true,
        netMonthlyEarnings: 145000,
        currentMonthlyAward: 50000,
      }),
    };
    const s = schedule({ prices: [{ ageBandId: 'all', sessionId: 'day', rate: 0 }] });
    const { months } = grossMonths(claimant, s);
    const result = applyUc(claimant, ucParams, months);
    expect(result.flatMap((m) => m.lines).some((l) => l.kind === 'uc-element')).toBe(false);
  });
});

describe('the full scheme pipeline composes', () => {
  it('funding, then TFC, keeps every month non-negative and itemised', () => {
    const profile = familyOf({ dobMonth: '2024-11' });
    const timeline = buildTimeline(profile, perDayHoursDeduction, isoMonth('2026-08'));
    const gross = calculateGross(perDayHoursDeduction, timeline);
    const funded = applyFunding(
      profile,
      perDayHoursDeduction,
      fundedHoursEngland2026April,
      timeline,
      gross,
    );
    const withTfc = applyTfc(profile, tfcParams, timeline, funded);
    const final = applyUc(profile, ucParams, withTfc);
    for (const [index, month] of final.entries()) {
      expect(month.totalPence).toBeGreaterThanOrEqual(0);
      const summed = month.lines
        .filter((l) => !l.excludedFromTotal)
        .reduce((t, l) => t + l.amountPence, 0);
      expect(summed).toBe(month.totalPence);
      expect(month.totalPence).toBeLessThanOrEqual(gross[index]?.totalPence ?? -1);
    }
    // Fully funded family: 9025 consumables, minus 20% TFC = 1805 → 7220.
    expect(final[1]?.totalPence).toBe(7220);
  });
});
