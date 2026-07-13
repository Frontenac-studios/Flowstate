import "server-only";

import { isSqliteMode } from "@/db/mode";

/** SQLite stores embeddings as JSON text; Postgres uses jsonb number[]. */
export function embeddingForDb(embedding: readonly number[]): number[] | string {
  if (!isSqliteMode()) return [...embedding];
  return JSON.stringify(embedding);
}

/** Cast for Drizzle writes typed as Postgres jsonb while SQLite uses text. */
export function embeddingColumn(embedding: readonly number[]): number[] {
  return embeddingForDb(embedding) as number[];
}

/** Normalize embedding values read from either backend. */
export function embeddingFromDb(value: unknown): number[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.every((n) => typeof n === "number") ? (value as number[]) : null;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
        return parsed as number[];
      }
    } catch {
      return null;
    }
  }
  return null;
}
