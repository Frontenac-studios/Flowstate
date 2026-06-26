import {
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { taskRecurrence } from "./task-recurrence";

// Phase 4 (4A): how a single occurrence of a recurring task differs from the rule.
export const occurrenceOverrideStatus = pgEnum("occurrence_override_status", [
  "completed",
  "skipped",
  "rescheduled",
  "edited",
]);

// One exception to a recurrence rule, keyed by the occurrence's rule-date (4D):
//   - completed   → completed_at set
//   - skipped     → occurrence dropped from expansion
//   - rescheduled → moved_to_date set (occurrence renders on the new date)
//   - edited      → patch holds the changed fields for this occurrence only
// The series itself is untouched; expand.ts merges these over the computed dates.
export const taskOccurrenceOverrides = pgTable(
  "task_occurrence_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    recurrenceId: uuid("recurrence_id")
      .notNull()
      .references(() => taskRecurrence.id, { onDelete: "cascade" }),
    occurrenceDate: date("occurrence_date", { mode: "string" }).notNull(),
    status: occurrenceOverrideStatus("status").notNull(),
    movedToDate: date("moved_to_date", { mode: "string" }),
    patch: jsonb("patch"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // At most one override per (rule, occurrence date).
    uniqueIndex("task_occurrence_overrides_recurrence_date_idx").on(
      table.recurrenceId,
      table.occurrenceDate
    ),
    index("task_occurrence_overrides_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
