import { FeeSchedule } from '@lemonhead/schemas';
import type { Child, FamilyProfile, Jurisdiction, Parents } from '@lemonhead/schemas';

const NURSERY_KEY = 'lemonhead:nursery';
const FAMILY_KEY = 'lemonhead:family';

/**
 * What persists across reloads. The UC money figures are deliberately absent
 * from this shape: they live in browser memory only and are re-asked after a
 * reload (NFR5 as amended, ADR 0007). The storage tests prove the exclusion.
 */
export interface StoredFamily {
  children: Child[];
  parents: Parents;
  jurisdiction: Jurisdiction;
  receivesUniversalCredit: boolean;
}

export function saveNursery(schedule: FeeSchedule): void {
  localStorage.setItem(NURSERY_KEY, JSON.stringify(schedule));
}

export function loadNursery(): FeeSchedule | null {
  const raw = localStorage.getItem(NURSERY_KEY);
  if (raw === null) return null;
  const parsed = FeeSchedule.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export function saveFamily(profile: FamilyProfile): void {
  const stored: StoredFamily = {
    children: profile.children,
    parents: profile.parents,
    jurisdiction: profile.jurisdiction,
    receivesUniversalCredit: profile.universalCredit.receives,
  };
  localStorage.setItem(FAMILY_KEY, JSON.stringify(stored));
}

export function loadFamily(): StoredFamily | null {
  const raw = localStorage.getItem(FAMILY_KEY);
  if (raw === null) return null;
  return JSON.parse(raw) as StoredFamily;
}

export function clearAll(): void {
  localStorage.removeItem(NURSERY_KEY);
  localStorage.removeItem(FAMILY_KEY);
}
