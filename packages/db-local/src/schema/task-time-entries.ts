import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const taskTimeEntries = sqliteTable("task_time_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  reason: text("reason").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
