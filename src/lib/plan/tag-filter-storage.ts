/**
 * Week tag filter state — independent from lens reveal toggles (Phase 5 / §14).
 * OR semantics: selecting multiple tags shows tasks with any of them.
 */

const KEY_PREFIX = "kash-tag-filter:";

export type TagFilterScope = "this-week";

function storageKey(scope: TagFilterScope): string {
  return `${KEY_PREFIX}${scope}`;
}

export function readTagFilter(scope: TagFilterScope): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  } catch {
    return [];
  }
}

export function writeTagFilter(scope: TagFilterScope, tags: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (tags.length === 0) window.localStorage.removeItem(storageKey(scope));
    else window.localStorage.setItem(storageKey(scope), tags.join(","));
  } catch {
    /* ignore quota / private mode */
  }
}

export function toggleTagFilterValue(current: string[], tag: string): string[] {
  return current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
}
