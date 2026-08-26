import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/directions.ts (W5). See there for the no-progress rationale. */
export const directions = sqliteTable(
  "directions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    statement: text("statement").notNull(),
    active: integer("active", { mode: "boolean" })
      .notNull()
      .$defaultFn(() => true),
    retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [index("directions_user_id_active_idx").on(table.userId, table.active)]
);
