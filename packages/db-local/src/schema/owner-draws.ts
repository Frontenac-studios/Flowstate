import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/owner-draws.ts. Financial-class, owner-only; local to this machine. */
export const ownerDraws = sqliteTable("owner_draws", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  drawnOn: integer("drawn_on", { mode: "timestamp_ms" }).notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
