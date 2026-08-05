import { describe, expect, it } from 'vitest';

import * as schemas from './index.ts';

describe('package barrel', () => {
  it('exposes the primitive schemas and month helpers', () => {
    expect(schemas.Pence).toBeDefined();
    expect(schemas.IsoMonth).toBeDefined();
    expect(schemas.FamilyProfile).toBeDefined();
    expect(schemas.addMonths).toBeTypeOf('function');
  });
});
