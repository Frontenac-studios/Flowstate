import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { reservedDayType } from "./planning-enums";

/** Flexible self-care / outside days per month (PM-4, ET-4). */
export const reservedDays = pgTable(
  "reserved_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    type: reservedDayType("type").notNull(),
    label: text("label"),
    resolvedDate: date("resolved_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("reserved_days_user_year_month_idx").on(table.userId, table.year, table.month),
    index("reserved_days_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
