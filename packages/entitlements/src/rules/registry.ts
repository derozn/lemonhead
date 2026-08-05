import type { IsoDate, Jurisdiction } from '@lemonhead/schemas';

import { fundedHoursEngland2026April } from './funded-hours/params/2026-04-06.england.ts';
import { taxFreeChildcare2026April } from './tax-free-childcare/params/2026-04-06.uk.ts';
import type {
  FundedHoursParams,
  RuleSet,
  TaxFreeChildcareParams,
  UniversalCreditParams,
} from './types.ts';
import { universalCredit2026April } from './universal-credit/params/2026-04-06.uk.ts';

/** Ordered oldest-first; a rates change is a new file appended here. */
const FUNDED_HOURS: readonly FundedHoursParams[] = [fundedHoursEngland2026April];
const TAX_FREE_CHILDCARE: readonly TaxFreeChildcareParams[] = [taxFreeChildcare2026April];
const UNIVERSAL_CREDIT: readonly UniversalCreditParams[] = [universalCredit2026April];

/** Exported for direct testing; not part of the package's public surface. */
export function latestEffective<T extends { effectiveFrom: IsoDate }>(
  paramsSets: readonly T[],
  asOfDate: IsoDate,
  scheme: string,
): T {
  let latest: T | undefined;
  for (const candidate of paramsSets) {
    if (candidate.effectiveFrom > asOfDate) continue;
    if (!latest || candidate.effectiveFrom > latest.effectiveFrom) latest = candidate;
  }
  if (!latest) {
    throw new RangeError(
      `No ${scheme} rule parameters in force on ${asOfDate}; the earliest encoded set takes effect ${paramsSets[0]?.effectiveFrom ?? '(none encoded)'}`,
    );
  }
  return latest;
}

/**
 * Resolve the rule set in force on `asOfDate`. The composite id is stamped
 * into every CostProjection so any historical projection can be recomputed
 * against exactly the parameters that produced it (design doc §4.1).
 */
export function resolveRuleSet(asOfDate: IsoDate, jurisdiction: Jurisdiction = 'england'): RuleSet {
  // Jurisdiction is single-valued today; a per-jurisdiction filter on
  // FUNDED_HOURS arrives with the first non-England params file.
  const fundedHours = latestEffective(FUNDED_HOURS, asOfDate, 'funded-hours');
  const taxFreeChildcare = latestEffective(TAX_FREE_CHILDCARE, asOfDate, 'tax-free-childcare');
  const universalCredit = latestEffective(UNIVERSAL_CREDIT, asOfDate, 'universal-credit');
  return {
    id: `${jurisdiction}/funded-hours@${fundedHours.effectiveFrom}+tfc@${taxFreeChildcare.effectiveFrom}+uc@${universalCredit.effectiveFrom}`,
    jurisdiction,
    fundedHours,
    taxFreeChildcare,
    universalCredit,
  };
}
