import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const REFLECTION_SCOPES = ["daily", "weekly", "monthly"] as const;

export const careReflections = sqliteTable(
  "care_reflections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    reflectionDate: text("reflection_date").notNull(),
    scope: text("scope", { enum: REFLECTION_SCOPES }).notNull().default("daily"),
    promptText: text("prompt_text").notNull(),
    bodyText: text("body_text"),
    mood: integer("mood"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("care_reflections_user_date_scope_idx").on(
      table.userId,
      table.reflectionDate,
      table.scope
    ),
    index("care_reflections_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
