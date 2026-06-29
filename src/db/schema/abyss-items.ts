import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projectCategory } from "./projects";
import { tasks } from "./tasks";

// Abyss taxonomy (kash-3.0-abyss-build-spec.md §6, taxonomy resolved Jun 26):
// references fold into ideas-with-links, so `type` is idea | task only.
export const abyssItemType = pgEnum("abyss_item_type", ["idea", "task"]);
// Where the item entered: chat/quick-capture vs the triage "Drop" action.
export const abyssItemSource = pgEnum("abyss_item_source", ["capture", "drop"]);
// Lifecycle: active → promoted (spawned a target, item stays) / archived (dimmed
// out after the inactivity threshold; retrievable, never hard-deleted).
export const abyssItemStatus = pgEnum("abyss_item_status", ["active", "promoted", "archived"]);

/** A link attached to an abyss item: an external URL or an uploaded image. */
export type AbyssLink = {
  kind: "url" | "image";
  url: string;
  title?: string;
};

/**
 * The Abyss: a tended home for backburner ideas and deferred tasks (§6 data model).
 * Items dim with age (`last_touched_at`) and brighten with `resurface_count`. Promotion
 * links a target but keeps the item; if the spawned task is dropped the item returns to
 * `active`. The embedding column (clustering / constellations) lands in sub-phase 7A.
 */
export const abyssItems = pgTable(
  "abyss_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    type: abyssItemType("type").notNull().default("idea"),
    note: text("note"),
    /** URLs now, images later (capture slice wires Storage uploads). */
    links: jsonb("links").$type<AbyssLink[]>(),
    /** Optional at capture; reuses the 5-category enum. */
    category: projectCategory("category"),
    /**
     * MiniLM title embedding (384-float unit vector) for near-duplicate resurfacing and
     * tag/constellation clustering (§7A). Stored as a JSON array — the model only ever
     * runs client-side (onnxruntime-node is excluded from serverless bundles); the server
     * does vector math on the stored arrays. Null until backfilled.
     */
    embedding: jsonb("embedding").$type<number[]>(),
    source: abyssItemSource("source").notNull().default("capture"),
    status: abyssItemStatus("status").notNull().default("active"),
    resurfaceCount: integer("resurface_count").notNull().default(0),
    lastResurfacedAt: timestamp("last_resurfaced_at", { withTimezone: true, mode: "date" }),
    lastTouchedAt: timestamp("last_touched_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    /** Set when a task-type item is promoted into a real task; cleared if that task is deleted. */
    promotedTaskId: uuid("promoted_task_id").references(() => tasks.id, { onDelete: "set null" }),
    /** Week / project / goal descriptor for non-task promotions. */
    promotedTarget: text("promoted_target"),
  },
  (table) => [
    index("abyss_items_user_id_status_idx").on(table.userId, table.status),
    index("abyss_items_user_id_last_touched_at_idx").on(table.userId, table.lastTouchedAt),
  ]
);
