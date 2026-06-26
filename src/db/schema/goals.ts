import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { bingoCards } from "./bingo-cards";
import { goalState, obligationDesire, targetHorizon } from "./planning-enums";
import { projectCategory, projects } from "./projects";

/** Annual / horizon goals — bingo cells or panel-only (§7, GP4). */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    bingoCardId: uuid("bingo_card_id").references(() => bingoCards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: projectCategory("category").notNull(),
    obligationDesire: obligationDesire("obligation_desire"),
    /** Nullable until §13 Values ships — no FK yet. */
    valueId: uuid("value_id"),
    targetHorizon: targetHorizon("target_horizon"),
    targetYear: integer("target_year"),
    targetQuarter: integer("target_quarter"),
    targetMonth: integer("target_month"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** 0–24 on the bingo grid; 12 is FREE and must not hold a goal. */
    cellIndex: integer("cell_index"),
    state: goalState("state").notNull().default("active"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("goals_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("goals_bingo_card_id_idx").on(table.bingoCardId),
    uniqueIndex("goals_bingo_card_cell_idx").on(table.bingoCardId, table.cellIndex),
  ]
);
