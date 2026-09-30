import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/fee-installments.ts (Spec v5 KashB2). Financial-class, owner-only. */
export const feeInstallments = sqliteTable(
  "fee_installments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    projectId: text("project_id").notNull(),
    label: text("label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    milestoneId: text("milestone_id"),
    readyAt: integer("ready_at", { mode: "timestamp_ms" }),
    invoiceId: text("invoice_id"),
    invoicedAt: integer("invoiced_at", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("fee_installments_user_id_project_id_idx").on(table.userId, table.projectId),
    index("fee_installments_invoice_id_idx").on(table.invoiceId),
    index("fee_installments_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
