import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

/**
 * Spec v5 DetailA — a task's checklist: short sub-steps ticked off inside the task
 * detail sheet. Not tasks themselves (no dates, projects or priority); they live and
 * die with their task.
 */
export const taskChecklistItems = pgTable(
  "task_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("task_checklist_items_task_id_sort_idx").on(table.taskId, table.sortOrder),
    index("task_checklist_items_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
