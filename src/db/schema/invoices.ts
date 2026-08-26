import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { clients } from "./clients";

/**
 * An accepted invoice — a per-client, per-period draft the user reviewed and
 * committed (W4, docs/v1-scope.md). Flowstate drafts, you sign (product law 1):
 * a draft is computed on the fly and NOT stored; a row appears here only once the
 * user accepts one. Un-accepting sets `status = 'void'` rather than deleting, so
 * the number history survives.
 *
 * Classified `financial` (see src/db/tenancy.ts): revenue a Member never reads.
 * Money lives here in its own table, never as a column on `clients` or `projects`
 * — the rule the tenancy test enforces.
 *
 * Which time entries an invoice billed is recorded on the entries themselves
 * (`time_entries.invoice_id`), not duplicated here: that single-valued link is
 * what makes double-billing impossible — an entry already carrying an invoice id
 * is never offered to another draft.
 *
 * All money is integer cents; all durations integer seconds. `billedSeconds` is
 * the invoiced total AFTER quarter-hour rounding (rounding happens once, at
 * line generation — never on the raw time log). `carriedSeconds` is a snapshot of
 * the client's still-unbilled billable time at the moment of acceptance.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    /** Who the invoice is for. Clients are archived, never deleted — no cascade. */
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    /** Per-client sequential number, assigned at acceptance (1, 2, 3, …). */
    invoiceNumber: integer("invoice_number").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true, mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true, mode: "date" }).notNull(),
    /** The billing threshold in force when this invoice was drafted (snapshot). */
    thresholdHours: integer("threshold_hours").notNull(),
    /** The client rate applied, in cents/hour (snapshot — a later rate change won't rewrite history). */
    rateCents: integer("rate_cents").notNull(),
    /** Invoiced hours as seconds, quarter-hour rounded (sum of the line items). */
    billedSeconds: integer("billed_seconds").notNull(),
    /** Still-unbilled billable seconds for this client at acceptance (informational). */
    carriedSeconds: integer("carried_seconds").notNull().default(0),
    /** The dollar total, in cents. */
    amountCents: integer("amount_cents").notNull(),
    /** `accepted | void`. Void keeps the row but releases its entries to bill again. */
    status: text("status").notNull().default("accepted"),
    note: text("note"),
    voidedAt: timestamp("voided_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("invoices_user_id_client_id_idx").on(table.userId, table.clientId),
    index("invoices_user_id_created_at_idx").on(table.userId, table.createdAt),
  ]
);
