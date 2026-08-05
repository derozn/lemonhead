import type { Pence } from '@lemonhead/schemas';
import { pence } from '@lemonhead/schemas';

// Placeholder crossing the schemas → entitlements boundary until task 4 lands
// the rule modules. A zero-cost projection is the only number the engine can
// honestly produce with no rules encoded yet.
export function zeroCost(): Pence {
  return pence(0);
}
