import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/project-fees.ts (W10f). Financial-class, owner-only. */
export const projectFees = sqliteTable(
  "project_fees",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    projectId: text("project_id").notNull(),
    proposalAmountCents: integer("proposal_amount_cents"),
    proposedAt: integer("proposed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("project_fees_user_id_project_id_idx").on(table.userId, table.projectId),
    index("project_fees_project_id_idx").on(table.projectId),
  ]
);
