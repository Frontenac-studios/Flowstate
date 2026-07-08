import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    threadId: text("thread_id").notNull(),
    role: text("role").notNull(),
    // JSON mode mirrors the Postgres `jsonb` column: Drizzle serializes the
    // object on write and parses it on read. Plain `text` would bind the raw
    // object, which better-sqlite3 misreads as a named-parameter bundle and
    // rejects with "Too few parameter values were provided".
    content: text("content", { mode: "json" }).notNull(),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("chat_messages_user_id_thread_id_created_at_idx").on(
      table.userId,
      table.threadId,
      table.createdAt
    ),
  ]
);
