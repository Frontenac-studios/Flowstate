import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { directions } from "./directions";
import {
  targetDerivationKey,
  targetHorizon,
  targetMeasureKind,
  targetMeasureSource,
  targetState,
} from "./planning-enums";

/**
 * A Target ("the bet") is a Direction made concrete: a number and a date. It is
 * `org_shared` (see src/db/tenancy.ts). Every Target belongs to a Direction — the
 * FK is non-nullable, so a bet can never float free of a rule (discovery §3).
 *
 * MONEY-NEVER-A-COLUMN (tenancy): `measureCurrent` is persisted for `manual` targets
 * only. For `auto` targets (e.g. `money_booked`) the current value is derived live at
 * read time from the owning financial source and is **never written onto this
 * org_shared row** — so a Member's `SELECT *` cannot read booked revenue off a bet,
 * and column-level security stays unnecessary (discovery §13 Q1 + CLAUDE.md).
 *
 * Cap 3 active-or-met per period, enforced in the mutation as a "retire one" moment.
 * A `met` Target archives off the active board (archivedAt + state=met) but still
 * counts toward the cap — winning early doesn't free a slot.
 */
export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    directionId: uuid("direction_id")
      .notNull()
      .references(() => directions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    horizon: targetHorizon("horizon").notNull().default("quarter"),
    periodStart: timestamp("period_start", { withTimezone: true, mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true, mode: "date" }).notNull(),
    measureKind: targetMeasureKind("measure_kind").notNull(),
    measureSource: targetMeasureSource("measure_source").notNull().default("manual"),
    /** Required when measureSource is `auto`; the financial/pipeline source to read. */
    derivationKey: targetDerivationKey("derivation_key"),
    /** For `currency` this is cents; for `count`/`shipped`, a whole number. */
    measureTarget: integer("measure_target").notNull(),
    /** Persisted for `manual` only; `auto` derives live and never stores money here. */
    measureCurrent: integer("measure_current"),
    state: targetState("state").notNull().default("active"),
    /** Set when the bet is objectively met; archives it off the active board. */
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("targets_user_id_state_idx").on(table.userId, table.state),
    index("targets_direction_id_idx").on(table.directionId),
  ]
);
