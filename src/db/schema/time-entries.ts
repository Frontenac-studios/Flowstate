import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { invoices } from "./invoices";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { timeTags } from "./time-tags";

/**
 * A tracked span of work. Renamed from `task_time_entries` in W2: an entry is now
 * scoped to a **project** (`project_id` NOT NULL), and a task is optional — a
 * 45-minute client call is not a task. Every downstream number (the Budget, the
 * Ledger, invoices, effective rate) is computed off this log.
 *
 * Classified `financial` (see src/db/tenancy.ts) as of W2: it carries `billable`
 * and `invoiced_at`, so a Member never reads it. When members are enabled, the
 * split — org_shared work-facts + a financial billing sidecar — is the v1.1 move;
 * until then the whole row is owner-only, which is the simplest correct boundary.
 *
 * `client_id` is deliberately absent: the client is derived through `project_id`.
 * A second copy would drift the moment a project is reassigned.
 *
 * Duration is never stored: `started_at` is authoritative and elapsed is computed,
 * so the timer survives quit, sleep, and midnight. Rounding to 0.25h happens only
 * when an invoice line is generated (W4), never here.
 */
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    /** The project the work is for. NOT NULL — the spine of every money number. */
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    /** Optional: an entry may be bare project + description with no task. */
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    /** What the span was — free text, shown in reports and grouped into invoice lines. */
    description: text("description"),
    /** Controlled tag (invoice structure). Null = untagged. */
    tagId: uuid("tag_id").references(() => timeTags.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    /** Whether this span is chargeable. Defaults from whether the project has a client. */
    billable: boolean("billable").notNull().default(false),
    /** How the row was created: `timer | manual | gap_fill`. */
    source: text("source").notNull().default("manual"),
    /** Set when this span is billed on an invoice; can never double-bill. */
    invoicedAt: timestamp("invoiced_at", { withTimezone: true, mode: "date" }),
    /**
     * The invoice this span was billed on (W4). Null = never billed and free to
     * appear on a draft. This single-valued link IS the double-bill guard: the
     * draft query only ever selects `invoice_id IS NULL` entries, and acceptance
     * stamps it only where still null. Voiding an invoice clears it (SET NULL).
     *
     * At the DB level the link is **write-once**, enforced by a trigger — not by
     * this convention alone (docs/v1-scope.md W4 requires DB enforcement). NULL ->
     * invoice (bill) and invoice -> NULL (void) are allowed, but re-pointing a
     * billed entry at a *different* invoice is rejected. See the trigger and its
     * rationale in `drizzle/0050_time_entries_invoice_id_immutable.sql` (mirrored
     * for desktop in packages/db-local/src/migrate.ts). Drizzle can't model a
     * trigger, so it lives in the migration, not this schema.
     */
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    /**
     * Legacy end-reason enum (`start | done | park | esc | pause | manual`), kept
     * from the task-scoped era because it is still shown in the entry list. Nullable
     * now — a project-first timer (W2b) need not carry one.
     */
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("time_entries_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("time_entries_user_id_started_at_idx").on(table.userId, table.startedAt),
    index("time_entries_user_id_project_id_idx").on(table.userId, table.projectId),
  ]
);
