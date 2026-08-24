import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow } from "../sqlite-defaults";

/** Mirrors src/db/schema/money-settings.ts. Financial-class, owner-only; one row per user. */
export const moneySettings = sqliteTable("money_settings", {
  userId: text("user_id").primaryKey(),
  orgId: text("org_id").notNull(),
  taxReservePercent: integer("tax_reserve_percent"),
  costOfLivingCents: integer("cost_of_living_cents"),
  personalSavingsCents: integer("personal_savings_cents"),
  minimumDrawCents: integer("minimum_draw_cents"),
  bankBalanceCents: integer("bank_balance_cents"),
  bankBalanceReconciledAt: integer("bank_balance_reconciled_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
