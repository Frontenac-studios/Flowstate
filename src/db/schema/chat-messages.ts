import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    threadId: text("thread_id").notNull(),
    role: text("role").notNull(),
    content: jsonb("content").notNull(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_messages_user_id_thread_id_created_at_idx").on(
      table.userId,
      table.threadId,
      table.createdAt
    ),
  ]
);
