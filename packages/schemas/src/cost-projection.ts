import { z } from 'zod';

import { AgeBandId, SessionId } from './fee-schedule.ts';
import { IsoDate, IsoMonth } from './iso-month.ts';
import { Jurisdiction, Pence } from './primitives.ts';

/**
 * The engine's validated output (design doc §3.4). Every line traces to a
 * source: a region of the fee schedule, a named rule with its gov.uk
 * citation, or explicitly none (FR6). The engine parses its own output
 * through this schema, so an invalid projection cannot leave the package.
 */

export const ProjectionCitation = z.object({
  url: z.string().min(1),
  quote: z.string().min(1),
  retrievedOn: z.string().min(1),
});
export type ProjectionCitation = z.infer<typeof ProjectionCitation>;

export const ProjectionSourceRef = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rule'), citation: ProjectionCitation }),
  z.object({
    type: z.literal('fee-schedule'),
    sessionId: SessionId.optional(),
    ageBandId: AgeBandId.optional(),
  }),
  z.object({ type: z.literal('none') }),
]);
export type ProjectionSourceRef = z.infer<typeof ProjectionSourceRef>;

export const ProjectionLineKind = z.enum([
  'gross-fees',
  'sibling-discount',
  'extra',
  'unknown-flag',
  'funded-hours-deduction',
  'consumables-charge',
  'funding-note',
  'tfc-top-up',
  'uc-element',
  'uc-signpost',
]);
export type ProjectionLineKind = z.infer<typeof ProjectionLineKind>;

export const ProjectionLine = z.object({
  kind: ProjectionLineKind,
  /** Negative for deductions, discounts, top-ups, and reimbursements. */
  amountPence: Pence,
  description: z.string().min(1),
  childIndex: z.number().int().nonnegative().optional(),
  excludedFromTotal: z.boolean(),
  assumptions: z.array(z.string()),
  source: ProjectionSourceRef,
});
export type ProjectionLine = z.infer<typeof ProjectionLine>;

export const ProjectionEligibility = z.object({
  status: z.enum(['eligible', 'ineligible', 'needs-info']),
  reasons: z.array(
    z.object({ message: z.string().min(1), citation: ProjectionCitation.optional() }),
  ),
});
export type ProjectionEligibility = z.infer<typeof ProjectionEligibility>;

export const CostProjection = z.object({
  /** Composite rule-set id, stamping exactly which parameters computed this. */
  ruleSetId: z.string().min(1),
  asOfDate: IsoDate,
  jurisdiction: Jurisdiction,
  months: z
    .array(
      z.object({
        month: IsoMonth,
        lines: z.array(ProjectionLine),
        totalPence: Pence,
      }),
    )
    .min(1),
  annual: z.object({
    grossPence: Pence,
    deductionsPence: Pence,
    netPence: Pence,
  }),
  eligibility: z.object({
    children: z.array(
      z.object({
        childIndex: z.number().int().nonnegative(),
        workingParentFundedHours: ProjectionEligibility,
        universalFundedHours: ProjectionEligibility,
        taxFreeChildcare: ProjectionEligibility,
      }),
    ),
    universalCredit: ProjectionEligibility,
  }),
});
export type CostProjection = z.infer<typeof CostProjection>;
