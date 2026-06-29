import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";

// Offline mirror of Postgres abyss_items (kash-3.0-abyss-build-spec.md §6). Enums
// become text columns; `links` jsonb is stored as a JSON string (see row-mapper).
export const ABYSS_ITEM_TYPE = ["idea", "task"] as const;
export const ABYSS_ITEM_SOURCE = ["capture", "drop"] as const;
export const ABYSS_ITEM_STATUS = ["active", "promoted", "archived"] as const;

export const abyssItems = sqliteTable(
  "abyss_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    type: text("type", { enum: ABYSS_ITEM_TYPE }).notNull().default("idea"),
    note: text("note"),
    links: text("links"),
    category: text("category"),
    // jsonb number[] in Postgres; stored as a JSON string here (see row-mapper).
    embedding: text("embedding"),
    source: text("source", { enum: ABYSS_ITEM_SOURCE }).notNull().default("capture"),
    status: text("status", { enum: ABYSS_ITEM_STATUS }).notNull().default("active"),
    resurfaceCount: integer("resurface_count").notNull().default(0),
    lastResurfacedAt: integer("last_resurfaced_at", { mode: "timestamp_ms" }),
    lastTouchedAt: integer("last_touched_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    promotedTaskId: text("promoted_task_id").references(() => tasks.id, { onDelete: "set null" }),
    promotedTarget: text("promoted_target"),
  },
  (table) => [
    index("abyss_items_user_id_status_idx").on(table.userId, table.status),
    index("abyss_items_user_id_last_touched_at_idx").on(table.userId, table.lastTouchedAt),
  ]
);
