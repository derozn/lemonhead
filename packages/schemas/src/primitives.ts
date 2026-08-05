import { z } from 'zod';

/**
 * Money is a branded integer number of pence. All arithmetic in the workspace
 * happens in pence; formatting to pounds is a UI concern. Floating-point money
 * is rejected at the boundary (ADR-001).
 */
export const Pence = z
  .number('Money must be a number of pence')
  .int('Money must be an integer number of pence, never a fractional amount')
  .brand<'Pence'>();
export type Pence = z.infer<typeof Pence>;

/** Pence that cannot be negative: rates, earnings, awards, charges. */
export const NonNegativePence = z
  .number('Money must be a number of pence')
  .int('Money must be an integer number of pence, never a fractional amount')
  .nonnegative('This amount cannot be negative')
  .brand<'Pence'>();
export type NonNegativePence = z.infer<typeof NonNegativePence>;

/** Convenience constructor: validates and brands a raw number as Pence. */
export function pence(value: number): Pence {
  return Pence.parse(value);
}

/**
 * Three-state answer for eligibility questions a parent may not know offhand.
 * 'unsure' must surface as a flagged range or signpost downstream, never a
 * silently assumed value (design doc §4.4).
 */
export const YesNoUnsure = z.enum(['yes', 'no', 'unsure']);
export type YesNoUnsure = z.infer<typeof YesNoUnsure>;

/**
 * England-only in v1 (spec §11.6). An enum rather than a literal so other UK
 * nations can be added without reshaping dependent schemas.
 */
export const Jurisdiction = z.enum(['england']);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

/**
 * How attendance is spread across the year: the statutory 38-week term-time
 * basis, or funded hours stretched across the full year.
 */
export const AttendancePattern = z.enum(['term-time-38', 'stretched-all-year']);
export type AttendancePattern = z.infer<typeof AttendancePattern>;
