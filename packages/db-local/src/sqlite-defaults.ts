import { randomUUID } from "node:crypto";

/** Primary key for SQLite rows (mirrors Postgres `defaultRandom()`). */
export function sqliteRowId(): string {
  return randomUUID();
}

/** Current time for SQLite timestamp_ms columns. */
export function sqliteNow(): Date {
  return new Date();
}
