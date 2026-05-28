import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    threadId: text("thread_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("chat_messages_user_id_thread_id_created_at_idx").on(
      table.userId,
      table.threadId,
      table.createdAt
    ),
  ]
);
