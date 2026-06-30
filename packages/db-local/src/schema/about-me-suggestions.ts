import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ABOUT_ME_SECTION, ABOUT_ME_SUGGESTION_STATUS } from "./about-me-enums";

// SQLite mirror of about_me_suggestions (§13 V2-2). `payload` is stored as JSON text.
export const aboutMeSuggestions = sqliteTable(
  "about_me_suggestions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    targetSection: text("target_section", { enum: ABOUT_ME_SECTION }).notNull(),
    payload: text("payload").notNull(),
    sourceText: text("source_text"),
    learnedAt: integer("learned_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: ABOUT_ME_SUGGESTION_STATUS }).notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("about_me_suggestions_user_target_status_idx").on(
      table.userId,
      table.targetSection,
      table.status
    ),
    index("about_me_suggestions_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
