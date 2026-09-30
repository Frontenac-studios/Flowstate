import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { invoices } from "./invoices";
import { projectMilestones } from "./project-milestones";
import { projects } from "./projects";

/**
 * One billable piece of a fixed fee — "Milestone 3 · $2,000" (Spec v5 KashB2).
 *
 * Classified `financial` (see src/db/tenancy.ts): it is an amount, and money never
 * becomes a column on the org_shared `projects` row.
 *
 * Readiness is derived, not stored: an installment is billable once its linked
 * milestone is completed OR `readyAt` is set (marked ready by hand). Deriving it
 * means un-completing a milestone un-readies the installment without a cross-table
 * write — `isInstallmentReady` in src/lib/money/fee-installments.ts is the one rule.
 *
 * Installments bill on their own fee invoice (`invoices.kind = 'fee'`). As with
 * `time_entries.invoice_id`, the link is write-once (a DB trigger, drizzle/0068):
 * voiding the invoice releases the installment, nothing can re-point it.
 */
export const feeInstallments = pgTable(
  "fee_installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Client-facing line label, e.g. "Milestone 3 — brand guidelines". */
    label: text("label").notNull(),
    /** The installment amount in cents (> 0). */
    amountCents: integer("amount_cents").notNull(),
    /** Optional milestone whose completion makes this billable. */
    milestoneId: uuid("milestone_id").references(() => projectMilestones.id, {
      onDelete: "set null",
    }),
    /** Marked ready to bill by hand (independent of any milestone). */
    readyAt: timestamp("ready_at", { withTimezone: true, mode: "date" }),
    /** The fee invoice that billed it. Null = not yet billed. */
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    invoicedAt: timestamp("invoiced_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("fee_installments_user_id_project_id_idx").on(table.userId, table.projectId),
    index("fee_installments_invoice_id_idx").on(table.invoiceId),
    index("fee_installments_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    check("fee_installments_amount_check", sql`${table.amountCents} > 0`),
  ]
);
