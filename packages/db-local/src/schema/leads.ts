import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/leads.ts (W10). See there for the not-a-project rationale. */
export const LEAD_SOURCES = ["sourced", "manual", "intake"] as const;
export const LEAD_STATES = [
  "new",
  "contacted",
  "engaged",
  "proposal",
  "promoted",
  "dismissed",
  "snoozed",
] as const;

export const leads = sqliteTable(
  "leads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    companyName: text("company_name").notNull(),
    segment: text("segment"),
    source: text("source", { enum: LEAD_SOURCES })
      .notNull()
      .$defaultFn(() => "manual"),
    score: integer("score"),
    confidence: integer("confidence"),
    rank: integer("rank"),
    // jsonb in Postgres → JSON-mode text in the mirror (object bind needs mode:"json").
    rationale: text("rationale", { mode: "json" }),
    state: text("state", { enum: LEAD_STATES })
      .notNull()
      .$defaultFn(() => "new"),
    dismissReason: text("dismiss_reason"),
    snoozeUntil: integer("snooze_until", { mode: "timestamp_ms" }),
    runId: text("run_id"),
    projectId: text("project_id"),
    directionId: text("direction_id"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("leads_user_id_state_idx").on(table.userId, table.state),
    index("leads_user_id_rank_idx").on(table.userId, table.rank),
  ]
);
