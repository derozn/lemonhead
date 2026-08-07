import { FeeSchedule } from '@lemonhead/schemas';
import type { Child, FamilyProfile, Jurisdiction, Parents } from '@lemonhead/schemas';

/** Pre-comparison key holding a single nursery; migrated into the list. */
const LEGACY_NURSERY_KEY = 'lemonhead:nursery';
const NURSERIES_KEY = 'lemonhead:nurseries';
const ACTIVE_NURSERY_KEY = 'lemonhead:active-nursery';
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

function readList(): FeeSchedule[] {
  const raw = localStorage.getItem(NURSERIES_KEY);
  if (raw === null) return [];
  const parsed = FeeSchedule.array().safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : [];
}

function writeList(list: FeeSchedule[]): void {
  localStorage.setItem(NURSERIES_KEY, JSON.stringify(list));
}

/**
 * Silently move a legacy single-nursery value into the list the first time
 * the store is read after the comparison feature lands. The legacy key is
 * removed either way; a value that no longer parses is dropped, matching how
 * the old loadNursery treated corruption.
 */
function migrateLegacyNursery(): void {
  const raw = localStorage.getItem(LEGACY_NURSERY_KEY);
  if (raw === null) return;
  localStorage.removeItem(LEGACY_NURSERY_KEY);
  const parsed = FeeSchedule.safeParse(JSON.parse(raw));
  if (!parsed.success) return;
  const list = readList();
  if (!list.some((entry) => entry.nursery.name === parsed.data.nursery.name)) {
    writeList([...list, parsed.data]);
  }
  if (localStorage.getItem(ACTIVE_NURSERY_KEY) === null) {
    setActiveNursery(parsed.data.nursery.name);
  }
}

export function listNurseries(): FeeSchedule[] {
  migrateLegacyNursery();
  return readList();
}

/**
 * Upsert by nursery name and make the saved nursery active. `replacing`
 * names the entry being edited, so a rename replaces the old entry instead
 * of leaving it behind as a duplicate.
 */
export function saveNursery(schedule: FeeSchedule, replacing?: string): void {
  const target = replacing ?? schedule.nursery.name;
  const list = listNurseries();
  const index = list.findIndex((entry) => entry.nursery.name === target);
  writeList(index === -1 ? [...list, schedule] : list.with(index, schedule));
  setActiveNursery(schedule.nursery.name);
}

/** Remove a nursery; the active pointer moves to the first survivor. */
export function deleteNursery(name: string): void {
  const remaining = listNurseries().filter((entry) => entry.nursery.name !== name);
  writeList(remaining);
  if (getActiveNurseryName() === name) {
    const [next] = remaining;
    if (next) {
      setActiveNursery(next.nursery.name);
    } else {
      localStorage.removeItem(ACTIVE_NURSERY_KEY);
    }
  }
}

export function getActiveNurseryName(): string | null {
  return localStorage.getItem(ACTIVE_NURSERY_KEY);
}

export function setActiveNursery(name: string): void {
  localStorage.setItem(ACTIVE_NURSERY_KEY, name);
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
  localStorage.removeItem(LEGACY_NURSERY_KEY);
  localStorage.removeItem(NURSERIES_KEY);
  localStorage.removeItem(ACTIVE_NURSERY_KEY);
  localStorage.removeItem(FAMILY_KEY);
}
