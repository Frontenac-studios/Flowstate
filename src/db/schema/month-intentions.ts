import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { projectCategory } from "./projects";

/** Per-category monthly intention lines (PM-4, ET-2). */
export const monthIntentions = pgTable(
  "month_intentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    category: projectCategory("category").notNull(),
    text: text("text").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("month_intentions_user_year_month_category_idx").on(
      table.userId,
      table.year,
      table.month,
      table.category
    ),
    index("month_intentions_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
