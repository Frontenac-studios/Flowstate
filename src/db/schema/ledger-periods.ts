import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { LedgerGroup } from "@/lib/ledger/compute-ledger";

/**
 * A sealed fortnight (W8 — the Ledger). Once a fortnight has closed, its read is
 * frozen: the tilt as it was actually declared at the time, the seconds either
 * side of it, and the client/project breakdown with the names it had then.
 *
 * The seconds and the breakdown are derivable from `time_entries` — that log is
 * append-only, so any past fortnight recomputes exactly. The tilt is NOT: it is a
 * single mutable value on `app_settings` with no history, so a recomputed
 * historical ledger would read against *today's* declaration and silently rewrite
 * what you said. Redeclaring 70% → 40% in October would retroactively make every
 * August ledger claim "you said 40%". Freezing the whole read, rather than only
 * the tilt, also keeps client and project names as they read at the time.
 *
 * Sealing is lazy and idempotent — `ledger.seal` writes any closed, unsealed
 * fortnight when the Money surface is opened. There is no cron and no background
 * job, because law 3 forbids one: nothing about the Ledger may reach the user on a
 * surface they did not open. The in-progress fortnight is never sealed; it is
 * computed live on every read.
 *
 * Classified `financial` (see src/db/tenancy.ts): the breakdown carries client
 * names against logged seconds, so a Member never reads it. `org_id` is absent for
 * the same reason it is absent on `time_entries` — the source of every number here
 * is keyed by user alone, and a second copy would be one more thing to drift.
 */
export const ledgerPeriods = pgTable(
  "ledger_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    /**
     * The fortnight's first local day — always a Friday, and its stable identity.
     * The last day and the closing Friday derive from it (src/lib/ledger/fortnight.ts).
     */
    periodStart: date("period_start", { mode: "string" }).notNull(),
    /** The declared business share as it stood when the fortnight was sealed. Null = never declared. */
    tiltBusinessPct: integer("tilt_business_pct"),
    businessSeconds: integer("business_seconds").notNull(),
    personalSeconds: integer("personal_seconds").notNull(),
    /** The frozen client/project breakdown, names included. */
    breakdown: jsonb("breakdown").$type<LedgerGroup[]>().notNull(),
    sealedAt: timestamp("sealed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // One seal per fortnight per user — the guard that makes sealing idempotent.
    uniqueIndex("ledger_periods_user_id_period_start_idx").on(table.userId, table.periodStart),
    index("ledger_periods_user_id_sealed_at_idx").on(table.userId, table.sealedAt),
  ]
);
