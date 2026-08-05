import { isoDate } from '@lemonhead/schemas';
import { describe, expect, it } from 'vitest';

import * as entitlements from './index.ts';

describe('package barrel', () => {
  it('exposes the registry, params, and eligibility assessors', () => {
    expect(entitlements.resolveRuleSet(isoDate('2026-08-05')).id).toContain('england');
    expect(entitlements.assessFundedHours).toBeTypeOf('function');
    expect(entitlements.assessTaxFreeChildcare).toBeTypeOf('function');
    expect(entitlements.assessUcChildcare).toBeTypeOf('function');
  });
});
