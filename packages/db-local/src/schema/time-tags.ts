import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/time-tags.ts. Controlled tag list, org_shared. */
export const timeTags = sqliteTable("time_tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
