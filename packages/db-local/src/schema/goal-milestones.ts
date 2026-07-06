import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { goals } from "./goals";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const goalMilestones = sqliteTable(
  "goal_milestones",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    targetDate: text("target_date"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("goal_milestones_goal_id_idx").on(table.goalId),
    index("goal_milestones_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
