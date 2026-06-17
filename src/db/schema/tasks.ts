import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { phases } from "./phases";
import { projectCategory, projects } from "./projects";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    phaseId: uuid("phase_id").references(() => phases.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    // Phase 1 (1.1): added nullable first; a follow-up migration backfills then sets NOT NULL.
    category: projectCategory("category"),
    // Phase 1 (1.1a / 1.4d): invisible-plumbing flag. true = stored as a NOT-NULL
    // placeholder but not really categorized — render a neutral "no category yet"
    // marker, keep out of balance math, re-resolve later (offline reconnect / backfill).
    categoryUnresolved: boolean("category_unresolved").notNull().default(false),
    priority: integer("priority").notNull().default(0),
    scheduledDate: date("scheduled_date", { mode: "string" }),
    bucketOverride: text("bucket_override"),
    sortOrder: integer("sort_order").notNull().default(0),
    isTop3: boolean("is_top_3").notNull().default(false),
    top3Order: integer("top_3_order"),
    top3PinnedAt: timestamp("top_3_pinned_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("tasks_user_id_scheduled_date_idx").on(table.userId, table.scheduledDate)]
);
