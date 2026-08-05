import { describe, expect, it } from 'vitest';

import { packageName } from './index.ts';

describe('workspace wiring', () => {
  it('resolves the schemas package', () => {
    expect(packageName).toBe('@lemonhead/schemas');
  });
});
