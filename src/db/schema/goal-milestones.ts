import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { goals } from "./goals";

/** Hybrid progress milestones — completion derived from linked tasks (PM1-3). */
export const goalMilestones = pgTable(
  "goal_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("goal_milestones_goal_id_idx").on(table.goalId),
    index("goal_milestones_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
