import "server-only";

import { isSqliteMode } from "@/db/mode";

/**
 * Postgres stores tags as jsonb string[]; the SQLite mirror's `tags` is a json-mode
 * text column, so Drizzle serializes the array itself — both take the array. An
 * empty list is stored as NULL in SQLite, as before.
 */
export function taskTagsForDb(tags: readonly string[]): string[] | null {
  if (isSqliteMode() && tags.length === 0) return null;
  return [...tags];
}

/** Cast for Drizzle inserts typed as Postgres jsonb while SQLite uses text. */
export function taskTagsColumn(tags: readonly string[]): string[] | null {
  return taskTagsForDb(tags) as string[] | null;
}
