import { z } from 'zod';

const ISO_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * A calendar month as 'YYYY-MM'. Child dates of birth are held at month
 * precision only (NFR5) and the projection horizon is a sequence of these.
 */
export const IsoMonth = z
  .string('Expected a month as a string in YYYY-MM form')
  .regex(ISO_MONTH_PATTERN, 'Expected a month in YYYY-MM form, e.g. 2026-08')
  .brand<'IsoMonth'>();
export type IsoMonth = z.infer<typeof IsoMonth>;

/** Convenience constructor: validates and brands a raw string as IsoMonth. */
export function isoMonth(value: string): IsoMonth {
  return IsoMonth.parse(value);
}

/** Zero-based month count since year 0. Internal comparison basis. */
function toMonthIndex(month: IsoMonth): number {
  const year = Number(month.slice(0, 4));
  const monthOfYear = Number(month.slice(5, 7));
  return year * 12 + (monthOfYear - 1);
}

function fromMonthIndex(index: number): IsoMonth {
  const year = Math.floor(index / 12);
  const monthOfYear = (index % 12) + 1;
  return isoMonth(`${String(year).padStart(4, '0')}-${String(monthOfYear).padStart(2, '0')}`);
}

/** The month `count` months after (or, when negative, before) `month`. */
export function addMonths(month: IsoMonth, count: number): IsoMonth {
  if (!Number.isInteger(count)) {
    throw new RangeError(`addMonths takes a whole number of months, got ${String(count)}`);
  }
  return fromMonthIndex(toMonthIndex(month) + count);
}

/** Signed number of months from `from` to `to`; negative when `to` is earlier. */
export function monthsBetween(from: IsoMonth, to: IsoMonth): number {
  return toMonthIndex(to) - toMonthIndex(from);
}

/**
 * A child's age in whole months during `atMonth`, given a month-precision date
 * of birth. Convention: with only the birth month known, the child is treated
 * as reaching age (atMonth - dobMonth) months within `atMonth`. Negative means
 * the child is not yet born in that month; callers decide how to handle it.
 */
export function ageInMonths(dobMonth: IsoMonth, atMonth: IsoMonth): number {
  return monthsBetween(dobMonth, atMonth);
}

/** Standard comparator result for sorting IsoMonths chronologically. */
export function compareIsoMonths(a: IsoMonth, b: IsoMonth): number {
  return toMonthIndex(a) - toMonthIndex(b);
}
