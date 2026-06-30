import { SEED_CATALOG } from "./seed-catalog";
import type { SeedPractice } from "./types";

// Adopt de-dupe logic (CL3). Pure + framework-free so the `catalog` and `adopt`
// procedures share one source of truth for "which seed keys are still available".
//
// A practice is adopted exactly once: adopting copies the seed into care_activities
// with catalog_key = key, and the catalog view hides any key the user already holds.
// `availableCatalog` is that hide; `isCatalogKey` guards `adopt` against junk keys.

/** Every shipped catalog key — the set the Adopt flow validates against. */
export const CATALOG_KEYS: ReadonlySet<string> = new Set(SEED_CATALOG.map((p) => p.key));

/** True when `key` names a real seed-catalog practice. */
export function isCatalogKey(key: string): boolean {
  return CATALOG_KEYS.has(key);
}

/**
 * The seed catalog minus the practices the user has already adopted. Unknown keys
 * in `adoptedKeys` (e.g. a retired practice still referenced by an old row) are
 * ignored — they simply match nothing.
 */
export function availableCatalog(adoptedKeys: Iterable<string>): SeedPractice[] {
  const adopted = adoptedKeys instanceof Set ? adoptedKeys : new Set(adoptedKeys);
  return SEED_CATALOG.filter((practice) => !adopted.has(practice.key));
}

export default availableCatalog;
