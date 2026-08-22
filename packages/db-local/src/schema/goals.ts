import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { GOAL_STATE, OBLIGATION_DESIRE, TARGET_HORIZON } from "./planning-enums";
import { PROJECT_CATEGORIES, projects } from "./projects";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const goals = sqliteTable(
  "goals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    obligationDesire: text("obligation_desire", { enum: OBLIGATION_DESIRE }),
    targetHorizon: text("target_horizon", { enum: TARGET_HORIZON }),
    targetYear: integer("target_year"),
    targetQuarter: integer("target_quarter"),
    targetMonth: integer("target_month"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    state: text("state", { enum: GOAL_STATE }).notNull().default("active"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [index("goals_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
