import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

// Phase 4 (4A): a task IS its recurrence template — exactly one rule per task
// (enforced by the unique index on task_id). The RRULE text encodes frequency,
// interval, byday, and the end (UNTIL / COUNT / never). Occurrence dates are
// computed from the rule (rrule.js, see src/lib/recurrence/expand.ts), never
// stored; per-date exceptions live in task_occurrence_overrides. A recurring
// template's own tasks.scheduled_date is unused — dates come from the rule.
export const taskRecurrence = pgTable(
  "task_recurrence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    rrule: text("rrule").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // One recurrence rule per task — the task is the template.
    uniqueIndex("task_recurrence_task_id_idx").on(table.taskId),
    index("task_recurrence_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
