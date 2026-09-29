import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Desktop mirror of src/db/schema/task-checklist-items.ts. */
export const taskChecklistItems = sqliteTable(
  "task_checklist_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("task_checklist_items_task_id_sort_idx").on(table.taskId, table.sortOrder),
    index("task_checklist_items_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
