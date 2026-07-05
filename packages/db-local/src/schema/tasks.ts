import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { careActivities } from "./care-activities";
import { goalMilestones } from "./goal-milestones";
import { phases } from "./phases";
import { PROJECT_CATEGORIES, projects } from "./projects";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    phaseId: text("phase_id").references(() => phases.id, { onDelete: "set null" }),
    milestoneId: text("milestone_id").references(() => goalMilestones.id, { onDelete: "set null" }),
    careActivityId: text("care_activity_id").references(() => careActivities.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    priority: integer("priority").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    scheduledDate: text("scheduled_date"),
    bucketOverride: text("bucket_override"),
    // NOT NULL to mirror the Postgres schema (1B): the resolver always produces a value.
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    categoryUnresolved: integer("category_unresolved", { mode: "boolean" })
      .notNull()
      .default(false),
    // jsonb string[] in Postgres; stored as a JSON string here (see row-mapper).
    tags: text("tags"),
    isTop3: integer("is_top_3", { mode: "boolean" }).notNull().default(false),
    top3Order: integer("top_3_order"),
    top3PinnedAt: integer("top_3_pinned_at", { mode: "timestamp_ms" }),
    timeEstimateMinutes: integer("time_estimate_minutes"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [index("tasks_user_id_scheduled_date_idx").on(table.userId, table.scheduledDate)]
);
