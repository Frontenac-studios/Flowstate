import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A business expense — one imported (or hand-entered) cost on the *business* side
 * of the owner's draw. Classified `financial` (see src/db/tenancy.ts): a Member
 * never reads it, so the amount never has to appear as a column on a table a
 * Member can read.
 *
 * These are deliberately **roll-up rows, not a transaction ledger**. Flowstate
 * imports coarse expense lines (CSV) to derive the running business-cash figure
 * behind the Draw panel; it never ingests categorized bank transactions. The day
 * it needs those it is the budgeting app the mission refuses to become (discovery
 * decision 2.2). `category` is a free-text coarse bucket, not a managed taxonomy.
 *
 * Amounts are integer cents — never floats — matching `rates.amountCents`.
 */
export const businessExpenses = pgTable(
  "business_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),
    /** Coarse free-text bucket ("software", "travel"). Not a managed taxonomy. */
    category: text("category"),
    /** The date the cost was incurred — supplied by the importer, not defaulted. */
    incurredOn: timestamp("incurred_on", { withTimezone: true, mode: "date" }).notNull(),
    /** How the row arrived: `manual` (typed) or `csv_import`. */
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("business_expenses_user_id_incurred_on_idx").on(table.userId, table.incurredOn)]
);
