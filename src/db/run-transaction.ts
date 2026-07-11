import "server-only";

import { db } from "./index";
import { isSqliteMode } from "./mode";

export type AppDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * better-sqlite3 transactions must be synchronous — an async callback makes
 * better-sqlite3 throw "Transaction function cannot return a promise". On
 * SQLite we run the body against the db handle without a native transaction
 * wrapper (single-user desktop; individual statements still commit).
 */
export async function runAppTransaction<T>(fn: (tx: AppDbTransaction) => Promise<T>): Promise<T> {
  if (isSqliteMode()) {
    return fn(db as AppDbTransaction);
  }
  return db.transaction(fn);
}
