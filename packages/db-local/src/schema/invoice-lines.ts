import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/invoice-lines.ts. Financial-class, owner-only; local to this machine. */
export const invoiceLines = sqliteTable("invoice_lines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  invoiceId: text("invoice_id").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  billedSeconds: integer("billed_seconds").notNull(),
  amountCents: integer("amount_cents").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
