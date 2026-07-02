/**
 * Task tags (§14) — freeform labels distinct from category and Abyss tags.
 * Preserve case on storage; dedupe case-insensitively on write.
 */

export const MAX_TAGS_PER_TASK = 20;
export const MAX_TASK_TAG_LENGTH = 64;

/** Fold a raw tag to its stored form: trimmed, whitespace-collapsed, length-capped. */
export function normalizeTaskTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, MAX_TASK_TAG_LENGTH).trim();
}

/** Normalize a tag list: drop empties, dedupe case-insensitively (first casing wins). */
export function normalizeTaskTags(raw: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of raw) {
    const normalized = normalizeTaskTag(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= MAX_TAGS_PER_TASK) break;
  }
  return out;
}

export interface TaskTaggable {
  tags?: string[] | null;
}

/** Distinct tags across tasks, sorted — autocomplete source for composer + filters. */
export function distinctTaskTags(items: readonly TaskTaggable[]): string[] {
  const byLower = new Map<string, string>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      const key = tag.toLowerCase();
      if (!byLower.has(key)) byLower.set(key, tag);
    }
  }
  return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
}

/** True when a task carries any of the selected tags (OR semantics, case-insensitive). */
export function taskMatchesTagFilter(
  tags: readonly string[] | null | undefined,
  selected: readonly string[]
): boolean {
  if (selected.length === 0) return true;
  const taskTags = tags ?? [];
  if (taskTags.length === 0) return false;
  const selectedLower = new Set(selected.map((t) => t.toLowerCase()));
  return taskTags.some((t) => selectedLower.has(t.toLowerCase()));
}
