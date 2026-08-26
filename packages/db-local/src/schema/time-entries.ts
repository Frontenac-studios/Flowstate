import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";
import { tasks } from "./tasks";
import { timeTags } from "./time-tags";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/time-entries.ts (renamed from task_time_entries in W2). */
export const timeEntries = sqliteTable("time_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  description: text("description"),
  tagId: text("tag_id").references(() => timeTags.id, { onDelete: "set null" }),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  billable: integer("billable", { mode: "boolean" })
    .notNull()
    .$defaultFn(() => false),
  source: text("source")
    .notNull()
    .$defaultFn(() => "manual"),
  invoicedAt: integer("invoiced_at", { mode: "timestamp_ms" }),
  // Write-once: a BEFORE UPDATE trigger (see runSqliteMigrations) rejects
  // re-pointing a billed entry at a different invoice, mirroring the Postgres
  // W4 double-bill guard. NULL<->invoice is fine; invoice->other-invoice is not.
  invoiceId: text("invoice_id"),
  reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
