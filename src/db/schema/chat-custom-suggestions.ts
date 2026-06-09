import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const chatCustomSuggestions = pgTable(
  "chat_custom_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    userText: text("user_text").notNull(),
    normalizedText: text("normalized_text").notNull(),
    label: text("label").notNull(),
    sendCount: integer("send_count").notNull().default(0),
    usageCount: integer("usage_count").notNull().default(0),
    promotedAt: timestamp("promoted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_custom_suggestions_user_id_normalized_text_idx").on(
      table.userId,
      table.normalizedText
    ),
  ]
);
