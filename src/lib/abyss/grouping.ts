import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

/**
 * Pure grouping / filtering / dimming logic for the Abyss List (slice 2). True
 * embedding-based "pattern" clustering arrives in sub-phase 7A; until then the
 * List groups by category, type, or age. Kept framework-free and unit-tested.
 */

export type AbyssItemType = "idea" | "task";
export type AbyssItemStatus = "active" | "promoted" | "archived";

/** The minimal item shape the List logic needs (a subset of the DB row). */
export interface AbyssGroupableItem {
  id: string;
  title: string;
  note: string | null;
  type: AbyssItemType;
  category: ProjectCategory | null;
  status: AbyssItemStatus;
  resurfaceCount: number;
  lastTouchedAt: Date;
  /** User tags (§7A); a shared tag is a constellation in "pattern" grouping. */
  tags?: string[] | null;
}

export type AbyssGroupMode = "category" | "type" | "age" | "pattern";
export type AbyssAgeFilter = "all" | "fresh" | "dimming";

export interface AbyssGroup<T extends AbyssGroupableItem = AbyssGroupableItem> {
  key: string;
  label: string;
  items: T[];
}

export interface AbyssFilter {
  /** When non-empty, only these types are kept. */
  types: AbyssItemType[];
  age: AbyssAgeFilter;
  query: string;
}

/** Days since an item was last touched (floored, never negative). */
export function ageInDays(now: Date, lastTouchedAt: Date): number {
  const ms = now.getTime() - lastTouchedAt.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Items past this age (and not yet archived) read as "dimming" / drifting. */
export const DIMMING_AFTER_DAYS = 60;
/** The inactivity threshold at which the archive job retires an item (slice 8). */
export const ARCHIVE_AFTER_DAYS = 90;
/** resurface_count at or above this surfaces an item in "Keeps calling you". */
export const KEEPS_CALLING_MIN = 3;

export function isDimming(now: Date, item: AbyssGroupableItem): boolean {
  return item.status === "active" && ageInDays(now, item.lastTouchedAt) >= DIMMING_AFTER_DAYS;
}

/**
 * Brightest-first ordering within a group: higher resurface_count first, then more
 * recently touched. Stable for equal items (preserves input order).
 */
export function compareByBrightness(a: AbyssGroupableItem, b: AbyssGroupableItem): number {
  if (a.resurfaceCount !== b.resurfaceCount) return b.resurfaceCount - a.resurfaceCount;
  return b.lastTouchedAt.getTime() - a.lastTouchedAt.getTime();
}

/** BK4 — list rows default to newest-first within a group. */
export function compareByRecency(a: AbyssGroupableItem, b: AbyssGroupableItem): number {
  return b.lastTouchedAt.getTime() - a.lastTouchedAt.getTime();
}

export function filterItems<T extends AbyssGroupableItem>(
  items: T[],
  filter: AbyssFilter,
  now: Date
): T[] {
  const q = filter.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.types.length > 0 && !filter.types.includes(item.type)) return false;

    if (filter.age === "fresh" && isDimming(now, item)) return false;
    if (filter.age === "dimming" && !isDimming(now, item)) return false;

    if (q.length > 0) {
      const haystack = `${item.title} ${item.note ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** The bright, always-on-top section: items that keep calling, brightest first. */
export function selectKeepsCalling<T extends AbyssGroupableItem>(items: T[]): T[] {
  return items
    .filter((item) => item.status === "active" && item.resurfaceCount >= KEEPS_CALLING_MIN)
    .sort(compareByBrightness);
}

const TYPE_LABELS: Record<AbyssItemType, string> = {
  idea: "Ideas",
  task: "Tasks",
};

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  professional: "Professional",
  personal_projects: "Personal Projects",
  relationships: "Relationships",
  body_mind: "Body & Mind",
  adulting: "Adulting",
};

function pushSorted<T extends AbyssGroupableItem>(
  groups: AbyssGroup<T>[],
  key: string,
  label: string,
  items: T[],
  compare: (a: T, b: T) => number = compareByRecency
): void {
  if (items.length === 0) return;
  groups.push({ key, label, items: [...items].sort(compare) });
}

/**
 * Group items for display. Empty groups are dropped; items within each group are
 * brightest-first. Group order is deterministic (category enum order / type order /
 * fresh-before-dimming) so the List never reshuffles between renders.
 */
export function groupItems<T extends AbyssGroupableItem>(
  items: T[],
  mode: AbyssGroupMode,
  now: Date
): AbyssGroup<T>[] {
  const groups: AbyssGroup<T>[] = [];

  if (mode === "category") {
    for (const category of PROJECT_CATEGORIES) {
      pushSorted(
        groups,
        category,
        CATEGORY_LABELS[category],
        items.filter((i) => i.category === category)
      );
    }
    pushSorted(
      groups,
      "uncategorised",
      "Uncategorised",
      items.filter((i) => i.category === null)
    );
    return groups;
  }

  if (mode === "type") {
    for (const type of ["idea", "task"] as const) {
      pushSorted(
        groups,
        type,
        TYPE_LABELS[type],
        items.filter((i) => i.type === type)
      );
    }
    return groups;
  }

  if (mode === "pattern") {
    // Group by tag (a shared tag = a constellation). Multi-tag items appear under each.
    // Tag groups order by size, then name; untagged items fall to a trailing group.
    const tagSet = new Set<string>();
    for (const item of items) {
      for (const tag of item.tags ?? []) tagSet.add(tag);
    }
    const byTag = Array.from(tagSet)
      .map((tag) => ({ tag, items: items.filter((i) => i.tags?.includes(tag)) }))
      .sort((a, b) => b.items.length - a.items.length || a.tag.localeCompare(b.tag));

    for (const { tag, items: tagItems } of byTag) {
      pushSorted(groups, `tag:${tag}`, tag, tagItems);
    }
    pushSorted(
      groups,
      "untagged",
      "Untagged",
      items.filter((i) => (i.tags?.length ?? 0) === 0)
    );
    return groups;
  }

  // age
  pushSorted(
    groups,
    "fresh",
    "Recent",
    items.filter((i) => !isDimming(now, i))
  );
  pushSorted(
    groups,
    "dimming",
    "Drifting — going dim",
    items.filter((i) => isDimming(now, i))
  );
  return groups;
}
