import { CostProjection, monthOf, Pence } from '@lemonhead/schemas';
import type {
  FamilyProfile,
  FeeSchedule,
  IsoDate,
  ProjectionLine,
  ProjectionSourceRef,
} from '@lemonhead/schemas';

import { assessFundedHours } from '../eligibility/funded-hours.ts';
import { assessTaxFreeChildcare } from '../eligibility/tax-free-childcare.ts';
import { assessUcChildcare } from '../eligibility/universal-credit.ts';
import { sumPence } from '../money.ts';
import { resolveRuleSet } from '../rules/registry.ts';

import { applyFunding } from './funding.ts';
import { calculateGross } from './gross.ts';
import type { GrossLine } from './gross.ts';
import { applyTfc } from './tax-free-childcare.ts';
import { buildTimeline } from './timeline.ts';
import { applyUc } from './universal-credit.ts';

function toSourceRef(line: GrossLine): ProjectionSourceRef {
  if (line.citation) return { type: 'rule', citation: line.citation };
  // Engine invariant: a line naming a session always names its band too.
  if (line.ageBandId !== undefined) {
    return {
      type: 'fee-schedule',
      ageBandId: line.ageBandId,
      ...(line.sessionId !== undefined ? { sessionId: line.sessionId } : {}),
    };
  }
  return { type: 'none' };
}

function toProjectionLine(line: GrossLine): ProjectionLine {
  return {
    kind: line.kind,
    amountPence: line.amountPence,
    description: line.description,
    ...(line.childIndex !== undefined ? { childIndex: line.childIndex } : {}),
    excludedFromTotal: line.excludedFromTotal,
    assumptions: line.assumptions,
    source: toSourceRef(line),
  };
}

/**
 * The engine's single public entry point (design doc §4.3): timeline →
 * gross → funding → TFC → UC, assembled into a CostProjection and parsed
 * through its own schema, so an invalid projection cannot leave the package.
 * Pure: the caller supplies asOfDate; nothing here reads a clock.
 */
export function calculateProjection(
  schedule: FeeSchedule,
  profile: FamilyProfile,
  options: { asOfDate: IsoDate; horizonMonths?: number },
): CostProjection {
  const ruleSet = resolveRuleSet(options.asOfDate, profile.jurisdiction);
  const startMonth = monthOf(options.asOfDate);
  const timeline = buildTimeline(profile, schedule, startMonth, options.horizonMonths);
  const gross = calculateGross(schedule, timeline);
  const funded = applyFunding(profile, schedule, ruleSet.fundedHours, timeline, gross);
  const withTfc = applyTfc(profile, ruleSet.taxFreeChildcare, timeline, funded);
  const final = applyUc(profile, ruleSet.universalCredit, withTfc);

  const grossAnnual = sumPence(gross.map((month) => month.totalPence));
  const netAnnual = sumPence(final.map((month) => month.totalPence));

  return CostProjection.parse({
    ruleSetId: ruleSet.id,
    asOfDate: options.asOfDate,
    jurisdiction: profile.jurisdiction,
    months: final.map((month) => ({
      month: month.month,
      lines: month.lines.map(toProjectionLine),
      totalPence: month.totalPence,
    })),
    annual: {
      grossPence: grossAnnual,
      deductionsPence: Pence.parse(grossAnnual - netAnnual),
      netPence: netAnnual,
    },
    eligibility: {
      children: profile.children.map((child, childIndex) => {
        const fundedHours = assessFundedHours(profile, child, ruleSet.fundedHours);
        return {
          childIndex,
          workingParentFundedHours: fundedHours.workingParent.result,
          universalFundedHours: fundedHours.universal.result,
          taxFreeChildcare: assessTaxFreeChildcare(
            profile,
            child,
            ruleSet.taxFreeChildcare,
            startMonth,
          ).result,
        };
      }),
      universalCredit: assessUcChildcare(profile, ruleSet.universalCredit).result,
    },
  });
}
