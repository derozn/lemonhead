import type { Citation } from '../rules/types.ts';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'needs-info';

export interface EligibilityReason {
  message: string;
  citation?: Citation;
}

/**
 * The outcome of one scheme's eligibility test for one household or child.
 * Reasons are user-facing and cited where they state a rule (FR6). 'unsure'
 * answers surface as 'needs-info', never as an assumed yes or no.
 */
export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: EligibilityReason[];
}
