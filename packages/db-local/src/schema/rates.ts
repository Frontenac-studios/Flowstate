import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/rates.ts. Financial-class, owner-only; local to this machine. */
export const rates = sqliteTable("rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  clientId: text("client_id").notNull(),
  projectId: text("project_id"),
  amountCents: integer("amount_cents").notNull(),
  effectiveFrom: integer("effective_from", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
