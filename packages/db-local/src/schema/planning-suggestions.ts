import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PLANNING_SUGGESTION_STATUS, PLANNING_SUGGESTION_SURFACE } from "./planning-enums";

export const planningSuggestions = sqliteTable(
  "planning_suggestions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    surface: text("surface", { enum: PLANNING_SUGGESTION_SURFACE }).notNull(),
    payload: text("payload").notNull(),
    status: text("status", { enum: PLANNING_SUGGESTION_STATUS }).notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("planning_suggestions_user_surface_status_idx").on(
      table.userId,
      table.surface,
      table.status
    ),
    index("planning_suggestions_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
