import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The held numbers behind the Draw panel — one row per user, keyed by `userId`
 * like `app_settings`. Classified `financial` (see src/db/tenancy.ts): a Member
 * never reads it.
 *
 * This is its own table, and NOT columns on `app_settings`, on purpose. Money
 * never becomes a column on a non-financial table — that single rule is what
 * keeps column-level security unnecessary, and `tenancy.test.ts` enforces it.
 *
 * Every tunable is nullable: this table is the *pipe*, laid during the W1 reshape
 * era (discovery decision 2.7). The Draw-panel slice that reads these — and the
 * open questions Q6–Q8 about tax-reserve tuning, savings, and the draw floor —
 * come later. Null means "not set yet"; the panel prompts rather than assuming.
 *
 * Amounts are integer cents; `taxReservePercent` is integer basis points
 * (3000 = 30%) — never floats.
 */
export const moneySettings = pgTable("money_settings", {
  userId: uuid("user_id").primaryKey(),
  orgId: uuid("org_id").notNull(),
  /** Fraction of revenue set aside for tax, in basis points (3000 = 30%). */
  taxReservePercent: integer("tax_reserve_percent"),
  /** The single held cost-of-living figure — the floor under the draw (decision 2.1). */
  costOfLivingCents: integer("cost_of_living_cents"),
  /** Optional personal-savings figure feeding personal runway (open Q8). */
  personalSavingsCents: integer("personal_savings_cents"),
  /** Optional floor on the monthly draw. */
  minimumDrawCents: integer("minimum_draw_cents"),
  /** Last manually-reconciled business bank balance; drift check, not a feed (decision 2.3). */
  bankBalanceCents: integer("bank_balance_cents"),
  bankBalanceReconciledAt: timestamp("bank_balance_reconciled_at", {
    withTimezone: true,
    mode: "date",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
