import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { valueSource } from "./about-me-enums";

// §13 V-1: a flat set of 3–7 core values (no ranking). `source` records whether the
// value came from the curated picker or the user typed their own. The 3–7 range is
// enforced in the app layer, not the DB. Table is named `user_values` (not `values`)
// because VALUES is a reserved SQL keyword. Goals reference a value via goals.value_id.
export const userValues = pgTable(
  "user_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    label: text("label").notNull(),
    source: valueSource("source").notNull(),
    // Flat set — sortOrder is display order only, never a rank/hierarchy (V1-1).
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("user_values_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
