import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const quarterThemes = sqliteTable(
  "quarter_themes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    phrase: text("phrase"),
    focusCategories: text("focus_categories").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("quarter_themes_user_year_quarter_idx").on(table.userId, table.year, table.quarter),
    index("quarter_themes_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
