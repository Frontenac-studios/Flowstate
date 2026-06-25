import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { bingoCards } from "./bingo-cards";
import { GOAL_STATE, OBLIGATION_DESIRE, TARGET_HORIZON } from "./planning-enums";
import { PROJECT_CATEGORIES, projects } from "./projects";

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    bingoCardId: text("bingo_card_id").references(() => bingoCards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    obligationDesire: text("obligation_desire", { enum: OBLIGATION_DESIRE }),
    valueId: text("value_id"),
    targetHorizon: text("target_horizon", { enum: TARGET_HORIZON }),
    targetYear: integer("target_year"),
    targetQuarter: integer("target_quarter"),
    targetMonth: integer("target_month"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    cellIndex: integer("cell_index"),
    state: text("state", { enum: GOAL_STATE }).notNull().default("active"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("goals_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("goals_bingo_card_id_idx").on(table.bingoCardId),
    uniqueIndex("goals_bingo_card_cell_idx").on(table.bingoCardId, table.cellIndex),
  ]
);
