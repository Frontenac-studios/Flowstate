import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Spec v3 "Ta" — a tag's kind and opt-in colour, per user, keyed by the lower-cased
 * tag name. Tags stay plain names on `tasks.tags`; this only styles them. The four
 * built-in status tags have code defaults (lib/tasks/tag-styles.ts) and only get a
 * row here when the user changes one.
 */
export const taskTagStyles = pgTable(
  "task_tag_styles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    /** Display name, as last written. */
    name: text("name").notNull(),
    /** tagKey(name): lower-cased, trimmed — the identity. */
    nameKey: text("name_key").notNull(),
    kind: text("kind"),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_tag_styles_user_id_name_key_idx").on(table.userId, table.nameKey),
    index("task_tag_styles_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    check(
      "task_tag_styles_kind_check",
      sql`${table.kind} IS NULL OR ${table.kind} IN ('status', 'type', 'effort', 'people')`
    ),
    check(
      "task_tag_styles_color_check",
      sql`${table.color} IS NULL OR ${table.color} IN ('sand', 'rose', 'sky', 'lilac', 'sage')`
    ),
  ]
);
