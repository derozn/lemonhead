import { z } from 'zod';

import { IsoMonth } from './iso-month.ts';
import { AttendancePattern, Jurisdiction, NonNegativePence, YesNoUnsure } from './primitives.ts';

/** Desired childcare attendance for one child. */
export const Attendance = z.object({
  daysPerWeek: z
    .number()
    .int('Days per week must be a whole number')
    .min(1, 'Attendance needs at least one day per week')
    .max(7, 'There are at most 7 days in a week'),
  hoursPerDay: z
    .number()
    .gt(0, 'Hours per day must be more than zero')
    .lte(24, 'Hours per day cannot exceed 24')
    .multipleOf(0.25, 'Hours are in quarter-hour steps, matching how nurseries bill'),
  pattern: AttendancePattern,
});
export type Attendance = z.infer<typeof Attendance>;

export const Child = z.object({
  /** Month precision only — no full birth dates are held (NFR5). */
  dobMonth: IsoMonth,
  /** Raises Tax-Free Childcare caps and age limit (gov.uk/tax-free-childcare). */
  disabled: z.boolean(),
  attendance: Attendance,
});
export type Child = z.infer<typeof Child>;

/**
 * The coarse facts the funded-hours and TFC eligibility tests actually check,
 * asked as questions a parent can answer. 'unsure' propagates as a signposted
 * range downstream. Exact income figures are never collected on this path.
 */
export const Parents = z.object({
  count: z.union([z.literal(1), z.literal(2)], 'A household has 1 or 2 parents for eligibility'),
  /** All parents in paid work (any hours) — the UC childcare element test. */
  allInPaidWork: YesNoUnsure,
  /** Each parent earning at least 16 h/week at the minimum wage for their age. */
  allMeetMinimumEarnings: YesNoUnsure,
  /** Any parent over £100,000 adjusted net income (a cliff edge, per parent). */
  anyOver100k: YesNoUnsure,
});
export type Parents = z.infer<typeof Parents>;

/**
 * Universal Credit status as a discriminated union: a claimant household
 * without its figures is unrepresentable (NFR6). The money fields exist only
 * on the claimant branch and are memory-only at the persistence layer — never
 * written to storage, never transmitted (NFR5 amendment, 2026-08-05).
 */
export const UniversalCreditStatus = z.discriminatedUnion('receives', [
  z.object({ receives: z.literal(false) }),
  z.object({
    receives: z.literal(true),
    /**
     * Combined household net monthly earnings (after tax and NI), in pence.
     * Also drives the benefit-cap exemption check — the £881/month threshold
     * tests exactly this figure, so it is computed, never asked.
     */
    netMonthlyEarnings: NonNegativePence,
    /** Current monthly UC award from the claimant's statement, in pence. */
    currentMonthlyAward: NonNegativePence,
  }),
]);
export type UniversalCreditStatus = z.infer<typeof UniversalCreditStatus>;

export const FamilyProfile = z.object({
  children: z.array(Child).min(1, 'A family profile needs at least one child'),
  parents: Parents,
  universalCredit: UniversalCreditStatus,
  jurisdiction: Jurisdiction,
});
export type FamilyProfile = z.infer<typeof FamilyProfile>;
