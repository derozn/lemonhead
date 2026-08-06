import type { Pence } from '@lemonhead/schemas';

import type { Citation } from '../rules/types.ts';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'needs-info';

export interface EligibilityReason {
  message: string;
  citation?: Citation;
  /**
   * Raw pence for each `{key}` placeholder in the message. The engine never
   * composes a £ string; the UI formats these (ADR 0008).
   */
  amounts?: Record<string, Pence>;
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
