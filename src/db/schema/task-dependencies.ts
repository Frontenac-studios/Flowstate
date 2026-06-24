import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

// Phase 3 (3.g): task A blocks task B. Join table, MANY blockers per task. Two edge
// kinds, distinguished by `expires_at` (3.h/3.l):
//   - project edge  (expires_at IS NULL)        → both tasks share a project; durable.
//   - window  edge  (expires_at = end-of-week)  → cross-task pair scheduled into
//                                                  Today/This Week; expires at the
//                                                  creator's ISO week boundary (3.i).
// Kind is decided by project-match at creation and frozen on the row. "Blocked" is
// computed live (3.j); edges are kept on blocker completion and cascade-removed on
// task deletion. expires_at also drives the read-time guard + the pg_cron sweep.
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    blockerTaskId: uuid("blocker_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    blockedTaskId: uuid("blocked_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    // null = durable project edge; set = window edge, absolute end-of-week (creator tz).
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // No duplicate edges for the same pair (3.e / edge rules).
    uniqueIndex("task_dependencies_user_blocker_blocked_idx").on(
      table.userId,
      table.blockerTaskId,
      table.blockedTaskId
    ),
    // Reverse lookups: a task's blockers (is-blocked) and a task's dependents (weight).
    index("task_dependencies_blocked_idx").on(table.userId, table.blockedTaskId),
    index("task_dependencies_blocker_idx").on(table.userId, table.blockerTaskId),
    index("task_dependencies_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
