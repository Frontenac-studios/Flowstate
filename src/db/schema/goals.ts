import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { goalState, obligationDesire, targetHorizon } from "./planning-enums";
import { projectCategory, projects } from "./projects";

/** Annual / horizon goals (§7, GP4). */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    category: projectCategory("category").notNull(),
    obligationDesire: obligationDesire("obligation_desire"),
    targetHorizon: targetHorizon("target_horizon"),
    targetYear: integer("target_year"),
    targetQuarter: integer("target_quarter"),
    targetMonth: integer("target_month"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    state: goalState("state").notNull().default("active"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
