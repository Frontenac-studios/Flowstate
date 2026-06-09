import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const chatCustomSuggestions = sqliteTable(
  "chat_custom_suggestions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    userText: text("user_text").notNull(),
    normalizedText: text("normalized_text").notNull(),
    label: text("label").notNull(),
    sendCount: integer("send_count").notNull().default(0),
    usageCount: integer("usage_count").notNull().default(0),
    promotedAt: integer("promoted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("chat_custom_suggestions_user_id_normalized_text_idx").on(
      table.userId,
      table.normalizedText
    ),
  ]
);
