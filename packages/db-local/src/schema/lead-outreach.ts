import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/lead-outreach.ts (W10). */
export const LEAD_OUTREACH_KINDS = ["opener", "follow_up"] as const;
export const LEAD_OUTREACH_STATUSES = ["draft", "sent"] as const;

export const leadOutreach = sqliteTable(
  "lead_outreach",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    leadId: text("lead_id").notNull(),
    kind: text("kind", { enum: LEAD_OUTREACH_KINDS }).notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: LEAD_OUTREACH_STATUSES })
      .notNull()
      .$defaultFn(() => "draft"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order")
      .notNull()
      .$defaultFn(() => 0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [index("lead_outreach_lead_id_idx").on(table.leadId)]
);
