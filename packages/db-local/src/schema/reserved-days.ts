import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { RESERVED_DAY_TYPE } from "./planning-enums";

export const reservedDays = sqliteTable(
  "reserved_days",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    type: text("type", { enum: RESERVED_DAY_TYPE }).notNull(),
    label: text("label"),
    resolvedDate: text("resolved_date"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("reserved_days_user_year_month_idx").on(table.userId, table.year, table.month),
    index("reserved_days_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
