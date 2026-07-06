import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

// SQLite mirror of the Postgres care_activities (enums stored as text). Value
// tuples are duplicated here (this package can't import the Next app's schema),
// matching the projects/PROJECT_CATEGORIES pattern.
export const CARE_THEMES = ["move", "calm", "connect", "rest", "nourish", "reflect"] as const;
export const CARE_KINDS = ["walk", "breathe", "reflect", "custom"] as const;
export const CARE_CADENCES = ["daily", "most_days", "weekly", "when_needed"] as const;
export const CARE_SOURCES = ["suggested", "custom"] as const;

export const careActivities = sqliteTable(
  "care_activities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    theme: text("theme", { enum: CARE_THEMES }).notNull(),
    kind: text("kind", { enum: CARE_KINDS }),
    cadence: text("cadence", { enum: CARE_CADENCES }),
    note: text("note"),
    source: text("source", { enum: CARE_SOURCES }).notNull(),
    catalogKey: text("catalog_key"),
    liftsMe: integer("lifts_me", { mode: "boolean" }).notNull().default(false),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [index("care_activities_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
