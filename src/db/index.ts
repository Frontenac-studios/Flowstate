import "server-only";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { createAppDb } from "./create-db";
import * as schema from "./schema";

export type AppDb = PostgresJsDatabase<typeof schema>;

const { db: rawDb } = createAppDb();

/** Typed as Postgres Drizzle client; SQLite mode uses compatible runtime API. */
export const db = rawDb as AppDb;
