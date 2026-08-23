import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/clients.ts. See there for the money-placement rationale. */
export const CLIENT_STATUSES = ["active", "archived"] as const;

export const clients = sqliteTable(
  "clients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    currency: text("currency")
      .notNull()
      .$defaultFn(() => "USD"),
    status: text("status", { enum: CLIENT_STATUSES })
      .notNull()
      .$defaultFn(() => "active"),
    notes: text("notes"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [uniqueIndex("clients_id_idx").on(table.id)]
);
