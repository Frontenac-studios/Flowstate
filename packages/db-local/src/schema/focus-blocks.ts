import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";

export const focusBlocks = sqliteTable("focus_blocks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
  status: text("status").notNull().default("planned"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
