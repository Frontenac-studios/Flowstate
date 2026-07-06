import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const nudgeEvents = sqliteTable(
  "nudge_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    localDate: text("local_date").notNull(),
    taskIds: text("task_ids").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("nudge_events_user_id_kind_local_date_idx").on(
      table.userId,
      table.kind,
      table.localDate
    ),
  ]
);
