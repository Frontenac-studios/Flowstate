import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { invoices } from "./invoices";

/**
 * One client-facing line on an invoice (W4). At most eight per invoice — the
 * draft engine merges the smallest groups into a single "Additional work" line so
 * the client sees a readable summary, not a raw timer dump. The label and the
 * one-sentence description are AI-drafted from the work and then edited by the
 * user before acceptance (product law 1 — the wording is a draft you sign).
 *
 * Classified `financial` (see src/db/tenancy.ts) alongside `invoices`: it carries
 * an amount.
 *
 * `billedSeconds` is quarter-hour rounded (a multiple of 900): the invoice's
 * rounding happens once, here at line generation, never on the raw time log.
 * `amountCents` = rounded hours × the invoice's rate.
 */
export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    /** Short client-facing label, e.g. "Reporting pipeline". */
    label: text("label").notNull(),
    /** One-sentence "what was delivered", in plain outcome language. */
    description: text("description").notNull().default(""),
    /** Billed duration in seconds, quarter-hour rounded (multiple of 900). */
    billedSeconds: integer("billed_seconds").notNull(),
    /** The line's dollar amount, in cents. */
    amountCents: integer("amount_cents").notNull(),
    /** Presentation order on the invoice (0-based). */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("invoice_lines_invoice_id_idx").on(table.invoiceId)]
);
