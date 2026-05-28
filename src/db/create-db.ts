import { createSqliteDb } from "@kash/db-local";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { isSqliteMode } from "./mode";
import * as pgSchema from "./schema";

export type AppDb = ReturnType<typeof createAppDb>["db"];

let sqliteSingleton: ReturnType<typeof createSqliteDb> | null = null;

export function createAppDb() {
  if (isSqliteMode()) {
    if (!sqliteSingleton) {
      sqliteSingleton = createSqliteDb();
    }
    return { db: sqliteSingleton.db };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when DATABASE_MODE is not sqlite");
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema: pgSchema });
  return { db };
}
