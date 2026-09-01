import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { leads } from "./leads";
import { leadOutreachKind, leadOutreachStatus } from "./sourcing-enums";

/**
 * Drafted outreach for a lead (W10e): the opener and 1–2 aging-clock follow-ups.
 * `org_shared`. Flowstate drafts, you send (Law 1) — v1 is copy / open-in-mail, so
 * `status` flips to `sent` when you mark it, no integration. Cascade on the lead.
 */
export const leadOutreach = pgTable(
  "lead_outreach",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    kind: leadOutreachKind("kind").notNull(),
    body: text("body").notNull(),
    status: leadOutreachStatus("status").notNull().default("draft"),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("lead_outreach_lead_id_idx").on(table.leadId)]
);
