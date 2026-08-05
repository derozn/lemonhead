import { Pence } from '@lemonhead/schemas';

/**
 * The only module where Pence multiplication and division happen. Integer
 * arithmetic with exactly one round-half-up per operation; every caller
 * composes these rather than touching `*` or `/` on money directly.
 *
 * Recorded exit criteria (owner discussion, 2026-08-05): adopt dinero.js if
 * this surface grows past a handful of functions, or if a true allocation
 * problem (splitting a top-down total without losing pennies) appears.
 * Quantities passed in are day counts or quarter-hour steps — dyadic
 * rationals, so products are exact in doubles before the single rounding.
 */

/** Sum amounts to Pence, revalidating the integer invariant at the boundary. */
export function sumPence(values: readonly number[]): Pence {
  return Pence.parse(values.reduce((total, value) => total + value, 0));
}

/** amount × percent ÷ 100, rounded half-up once. */
export function applyPercent(amount: Pence, percent: number): Pence {
  return Pence.parse(Math.round((amount * percent) / 100));
}

/** rate × quantity, rounded half-up once. */
export function multiplyRate(rate: Pence, quantity: number): Pence {
  return Pence.parse(Math.round(rate * quantity));
}

/** amount × numerator ÷ denominator, rounded half-up once. */
export function proRata(amount: Pence, numerator: number, denominator: number): Pence {
  return Pence.parse(Math.round((amount * numerator) / denominator));
}

/** Negate an amount (discount and deduction lines are negative). */
export function negate(amount: Pence): Pence {
  return Pence.parse(0 - amount);
}
