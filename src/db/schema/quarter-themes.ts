import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Quarterly theme + focus categories (PM-3, ET-1). */
export const quarterThemes = pgTable(
  "quarter_themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    phrase: text("phrase"),
    /** JSON array of `project_category` enum values. */
    focusCategories: jsonb("focus_categories").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("quarter_themes_user_year_quarter_idx").on(table.userId, table.year, table.quarter),
    index("quarter_themes_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
