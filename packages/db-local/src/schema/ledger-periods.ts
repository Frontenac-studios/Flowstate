import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/ledger-periods.ts (W8). Financial-class, owner-only. */
export const ledgerPeriods = sqliteTable(
  "ledger_periods",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    periodStart: text("period_start").notNull(),
    tiltBusinessPct: integer("tilt_business_pct"),
    businessSeconds: integer("business_seconds").notNull(),
    personalSeconds: integer("personal_seconds").notNull(),
    breakdown: text("breakdown", { mode: "json" }).notNull(),
    sealedAt: integer("sealed_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("ledger_periods_user_id_period_start_idx").on(table.userId, table.periodStart),
  ]
);
