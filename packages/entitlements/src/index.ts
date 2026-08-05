import { packageName as schemasPackageName } from '@lemonhead/schemas';

// Placeholder crossing the schemas → entitlements boundary so the workspace
// dependency is exercised before task 4 lands the real rule modules.
export function dependsOnSchemas(): string {
  return `@lemonhead/entitlements depends on ${schemasPackageName}`;
}
