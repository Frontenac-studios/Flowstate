import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";

export const phases = pgTable(
  "phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentPhaseId: uuid("parent_phase_id"),
    name: text("name").notNull(),
    description: text("description"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentPhaseId],
      foreignColumns: [table.id],
      name: "phases_parent_phase_id_fk",
    }).onDelete("cascade"),
    index("phases_user_id_project_id_idx").on(table.userId, table.projectId),
    index("phases_parent_phase_id_idx").on(table.parentPhaseId),
    index("phases_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
