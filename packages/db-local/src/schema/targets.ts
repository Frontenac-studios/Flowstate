import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/targets.ts (W5). See there for the money-never-a-column rationale. */
export const TARGET_HORIZONS = ["year", "quarter", "month", "week"] as const;
export const TARGET_MEASURE_KINDS = ["currency", "count", "shipped"] as const;
export const TARGET_MEASURE_SOURCES = ["auto", "manual"] as const;
export const TARGET_DERIVATION_KEYS = [
  "money_booked",
  "clients_signed",
  "milestones_shipped",
] as const;
export const TARGET_STATES = ["active", "met", "carried", "dropped"] as const;

export const targets = sqliteTable(
  "targets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    directionId: text("direction_id").notNull(),
    title: text("title").notNull(),
    horizon: text("horizon", { enum: TARGET_HORIZONS })
      .notNull()
      .$defaultFn(() => "quarter"),
    periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
    periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
    measureKind: text("measure_kind", { enum: TARGET_MEASURE_KINDS }).notNull(),
    measureSource: text("measure_source", { enum: TARGET_MEASURE_SOURCES })
      .notNull()
      .$defaultFn(() => "manual"),
    derivationKey: text("derivation_key", { enum: TARGET_DERIVATION_KEYS }),
    measureTarget: integer("measure_target").notNull(),
    measureCurrent: integer("measure_current"),
    state: text("state", { enum: TARGET_STATES })
      .notNull()
      .$defaultFn(() => "active"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("targets_user_id_state_idx").on(table.userId, table.state),
    index("targets_direction_id_idx").on(table.directionId),
  ]
);
