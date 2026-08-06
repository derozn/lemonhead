import { isoDate, UniversalCreditStatus } from '@lemonhead/schemas';
import type { CostProjection, FamilyProfile, FeeSchedule } from '@lemonhead/schemas';
import {
  familyOf,
  fundedRateDeduction,
  perDayHoursDeduction,
  perHourConditionalFunding,
  ucHouseholdTwoChildren,
  unsureEligibilityFamily,
} from '@lemonhead/schemas/fixtures';
import { describe, expect, it } from 'vitest';

import { calculateProjection } from './projection.ts';

/**
 * ADR 0008 regression net: the engine never composes a £ string. Every money
 * figure a description, assumption, or eligibility message mentions must be a
 * `{key}` placeholder backed by raw pence in `amounts`, formatted by the UI
 * and nowhere else. The sweep runs the full pipeline over the richest fixture
 * nurseries crossed with profiles chosen to reach every string the engine can
 * emit: funded, capped, consumables-declined, TFC-topped-up, UC-modelled,
 * benefit-cap-warned, zero-award, needs-info, and over-the-income-ceiling.
 */

const AS_OF = { asOfDate: isoDate('2026-08-05') };

const belowCapClaimant: FamilyProfile = {
  ...familyOf({ dobMonth: '2024-01' }),
  universalCredit: UniversalCreditStatus.parse({
    receives: true,
    netMonthlyEarnings: 80000,
    currentMonthlyAward: 50000,
  }),
};

const zeroAwardClaimant: FamilyProfile = {
  ...familyOf({ dobMonth: '2024-01' }),
  universalCredit: UniversalCreditStatus.parse({
    receives: true,
    netMonthlyEarnings: 145000,
    currentMonthlyAward: 0,
  }),
};

const overIncomeCeiling: FamilyProfile = {
  ...familyOf({ dobMonth: '2024-11' }),
  parents: { count: 2, allInPaidWork: 'yes', allMeetMinimumEarnings: 'yes', anyOver100k: 'yes' },
};

const scenarios: [string, FeeSchedule, FamilyProfile][] = [
  ['funded family, Sunny Bank', perDayHoursDeduction, familyOf({ dobMonth: '2024-11' })],
  [
    'capped funding, Little Acorns',
    perHourConditionalFunding,
    familyOf({ dobMonth: '2024-01', daysPerWeek: 2, hoursPerDay: 8 }),
  ],
  [
    'consumables decline, The Orchard',
    fundedRateDeduction,
    familyOf({ dobMonth: '2023-03', daysPerWeek: 1, hoursPerDay: 4 }),
  ],
  ['UC household, Sunny Bank', perDayHoursDeduction, ucHouseholdTwoChildren],
  ['UC claimant below the benefit-cap exemption', perDayHoursDeduction, belowCapClaimant],
  ['UC claimant with a zero award', perDayHoursDeduction, zeroAwardClaimant],
  ['unsure answers everywhere', perDayHoursDeduction, unsureEligibilityFamily],
  ['a parent over the income ceiling', fundedRateDeduction, overIncomeCeiling],
  [
    'siblings with discounts and extras',
    perDayHoursDeduction,
    familyOf({ dobMonth: '2022-01' }, { dobMonth: '2024-11' }),
  ],
];

interface Explanation {
  where: string;
  texts: string[];
  amounts: Record<string, number> | undefined;
}

/** Every user-facing text the projection carries, with its amounts record. */
function explanations(projection: CostProjection): Explanation[] {
  const fromLines = projection.months.flatMap((month, monthIndex) =>
    month.lines.map((line, lineIndex) => ({
      where: `${month.month} line ${String(lineIndex)} (${line.kind}), month ${String(monthIndex)}`,
      texts: [line.description, ...line.assumptions],
      amounts: line.amounts,
    })),
  );
  const eligibilities = [
    ...projection.eligibility.children.flatMap((child) => [
      child.workingParentFundedHours,
      child.universalFundedHours,
      child.taxFreeChildcare,
    ]),
    projection.eligibility.universalCredit,
  ];
  const fromReasons = eligibilities.flatMap((eligibility) =>
    eligibility.reasons.map((reason, reasonIndex) => ({
      where: `eligibility reason ${String(reasonIndex)} (${eligibility.status})`,
      texts: [reason.message],
      amounts: reason.amounts,
    })),
  );
  return [...fromLines, ...fromReasons];
}

function placeholdersIn(texts: string[]): string[] {
  return texts.flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? ''));
}

describe.each(scenarios)('money boundary: %s', (_name, schedule, profile) => {
  const projection = calculateProjection(schedule, profile, AS_OF);
  const all = explanations(projection);

  it('emits at least one explanation to check', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it('never writes a £ amount into any description, assumption, or message', () => {
    for (const explanation of all) {
      for (const text of explanation.texts) {
        expect(text, explanation.where).not.toMatch(/£\d/);
      }
    }
  });

  it('backs every {placeholder} with pence in amounts, and mentions every amount', () => {
    for (const explanation of all) {
      const referenced = placeholdersIn(explanation.texts).sort();
      const provided = Object.keys(explanation.amounts ?? {}).sort();
      expect(referenced, explanation.where).toEqual(provided);
    }
  });
});
