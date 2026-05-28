import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { runSqliteMigrations } from "./migrate";
import * as schema from "./schema";

export type SqliteDb = BetterSQLite3Database<typeof schema>;

export function resolveDefaultDbPath(): string {
  const dataDir =
    process.env.KASH_DATA_DIR ??
    path.join(process.env.HOME ?? process.cwd(), "Library", "Application Support", "Kash");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "kash.db");
}

export function createSqliteDb(dbPath = resolveDefaultDbPath()): {
  sqlite: Database.Database;
  db: SqliteDb;
} {
  const sqlite = new Database(dbPath);
  sqlite.pragma("busy_timeout = 5000");
  if (dbPath !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("foreign_keys = ON");
  runSqliteMigrations(sqlite);
  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

export { schema, runSqliteMigrations };
export * from "./schema";
