import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";

// Offline mirror of Postgres task_dependencies (Phase 3). expires_at nullable:
// null = durable project edge, set = window edge (read-time guard ignores expired).
export const taskDependencies = sqliteTable("task_dependencies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  blockerTaskId: text("blocker_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  blockedTaskId: text("blocked_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
