import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * An owner's draw — money the owner takes out of the business (Chart of Accounts
 * 3200, Owner's Draws). It is its OWN row type, deliberately not a business expense:
 * a draw reduces business cash but is not a cost of doing business, so it never
 * enters the P&L expense side. The running cash ledger is paid invoices − expenses −
 * draws (W16, discovery decision 2.3).
 *
 * Classified `financial` (see src/db/tenancy.ts): a Member never reads it. Amounts
 * are integer cents — never floats.
 */
export const ownerDraws = pgTable(
  "owner_draws",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** The date the draw was taken. Supplied by the user, not defaulted. */
    drawnOn: timestamp("drawn_on", { withTimezone: true, mode: "date" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("owner_draws_user_id_drawn_on_idx").on(table.userId, table.drawnOn)]
);
