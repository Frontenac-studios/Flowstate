import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projectCategory } from "./projects";

// Phase 1 (1.2): one row per category per user. The single source of truth for a
// user's category label/color overrides and sort order. Composer accent bar, chips,
// and task-row borders all read from here; PROJECT_CATEGORY_META stays as the seed +
// pre-settings fallback. (The never-surfaced `weekly_target` weighting was dropped in
// W6 — the Budget measures time, not per-category task targets.)
export const categorySettings = pgTable(
  "category_settings",
  {
    userId: uuid("user_id").notNull(),
    category: projectCategory("category").notNull(),
    // null = fall back to PROJECT_CATEGORY_META (and, later, Design Tokens for color).
    label: text("label"),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.category] }),
    index("category_settings_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
