export type {
  Citation,
  FundedHoursParams,
  QuarterlyEarningsThresholds,
  RuleSet,
  TaxFreeChildcareParams,
  UniversalCreditParams,
} from './rules/types.ts';
export { resolveRuleSet } from './rules/registry.ts';
export { firstTermStartAfter } from './rules/term-dates.ts';
export { fundedHoursEngland2026April } from './rules/funded-hours/params/2026-04-06.england.ts';
export { taxFreeChildcare2026April } from './rules/tax-free-childcare/params/2026-04-06.uk.ts';
export { universalCredit2026April } from './rules/universal-credit/params/2026-04-06.uk.ts';
export type {
  EligibilityReason,
  EligibilityResult,
  EligibilityStatus,
} from './eligibility/types.ts';
export { assessFundedHours } from './eligibility/funded-hours.ts';
export type {
  FundedHoursAssessment,
  FundedHoursAssessments,
  FundedHoursScheme,
} from './eligibility/funded-hours.ts';
export { applyFunding } from './engine/funding.ts';
export { applyTfc } from './engine/tax-free-childcare.ts';
export { applyUc } from './engine/universal-credit.ts';
export { calculateProjection } from './engine/projection.ts';
export { assessTaxFreeChildcare } from './eligibility/tax-free-childcare.ts';
export type { TfcAssessment } from './eligibility/tax-free-childcare.ts';
export { assessUcChildcare } from './eligibility/universal-credit.ts';
export type { UcChildcareAssessment } from './eligibility/universal-credit.ts';
export { applyPercent, multiplyRate, negate, proRata, sumPence } from './money.ts';
export { buildTimeline, DEFAULT_HORIZON_MONTHS } from './engine/timeline.ts';
export type { ChildBandStatus, ChildMonth, TimelineMonth } from './engine/timeline.ts';
export { calculateGross } from './engine/gross.ts';
export type { GrossLine, MonthlyGross } from './engine/gross.ts';
