import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { careCadence, careKind, careSource, careTheme } from "./care-enums";

// A self-care practice — adopted from the suggested seed catalog
// (source "suggested", catalogKey set) or user-created ("custom"). The library
// is a shelf of definitions, not a to-do list (model A): doing one logs a
// care_event, and "Add to my day" spawns a Body & Mind task linked back via
// tasks.care_activity_id. Removal is a soft archive (archivedAt), never a delete.
export const careActivities = pgTable(
  "care_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    theme: careTheme("theme").notNull(),
    kind: careKind("kind"),
    cadence: careCadence("cadence"),
    note: text("note"),
    source: careSource("source").notNull(),
    catalogKey: text("catalog_key"),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("care_activities_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
