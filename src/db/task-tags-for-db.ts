import "server-only";

import { isSqliteMode } from "@/db/mode";

/** SQLite stores tags as JSON text; Postgres uses jsonb string[]. */
export function taskTagsForDb(tags: readonly string[]): string[] | string | null {
  if (!isSqliteMode()) return [...tags];
  if (tags.length === 0) return null;
  return JSON.stringify(tags);
}

/** Cast for Drizzle inserts typed as Postgres jsonb while SQLite uses text. */
export function taskTagsColumn(tags: readonly string[]): string[] | null {
  return taskTagsForDb(tags) as string[] | null;
}
