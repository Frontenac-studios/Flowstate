import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projectCategory } from "./projects";

/** 0 = Monday … 6 = Sunday (matches `datesInIsoWeek` index). */
export const protectedBlockTemplates = pgTable(
  "protected_block_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    category: projectCategory("category").notNull(),
    isoWeekday: integer("iso_weekday").notNull(),
    label: text("label"),
    /** Minutes from local midnight; null = all-day / no fixed clock. */
    startMin: integer("start_min"),
    endMin: integer("end_min"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("protected_block_templates_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("protected_block_templates_user_id_iso_weekday_idx").on(table.userId, table.isoWeekday),
  ]
);
