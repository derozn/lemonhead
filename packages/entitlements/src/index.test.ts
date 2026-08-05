import { describe, expect, it } from 'vitest';

import { zeroCost } from './index.ts';

describe('workspace wiring', () => {
  it('imports the schemas Pence brand across the package boundary', () => {
    expect(zeroCost()).toBe(0);
  });
});
