import { addMonths } from '@lemonhead/schemas';
import type { IsoMonth } from '@lemonhead/schemas';

/**
 * The first term start strictly after `qualifyingMonth`.
 *
 * Entitlements begin "the term after the child's birthday" (DfE guidance;
 * terms start 1 September, 1 January, 1 April). DOBs are month-precision, so
 * the exact birthday is unknown; treating the birthday month as never
 * satisfying "before the term" matches the statutory wording for every day of
 * the month: a September birthday starts funding on 1 January.
 */
export function firstTermStartAfter(
  qualifyingMonth: IsoMonth,
  termStartMonths: readonly number[],
): IsoMonth {
  for (let offset = 1; offset <= 12; offset += 1) {
    const candidate = addMonths(qualifyingMonth, offset);
    const monthOfYear = Number(candidate.slice(5, 7));
    if (termStartMonths.includes(monthOfYear)) return candidate;
  }
  throw new RangeError(
    `No term start found within a year of ${qualifyingMonth}; termStartMonths ${JSON.stringify(termStartMonths)} is misconfigured`,
  );
}
