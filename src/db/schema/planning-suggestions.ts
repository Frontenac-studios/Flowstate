import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { planningSuggestionStatus, planningSuggestionSurface } from "./planning-enums";

/** Persisted ghosted AI suggestions (§9 GA-4). */
export const planningSuggestions = pgTable(
  "planning_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    surface: planningSuggestionSurface("surface").notNull(),
    payload: jsonb("payload").notNull(),
    status: planningSuggestionStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
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
