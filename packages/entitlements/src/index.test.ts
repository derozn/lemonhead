import { describe, expect, it } from 'vitest';
import { dependsOnSchemas } from './index.ts';

describe('workspace wiring', () => {
  it('imports across the schemas boundary', () => {
    expect(dependsOnSchemas()).toBe(
      '@lemonhead/entitlements depends on @lemonhead/schemas',
    );
  });
});
