import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/invoices.ts. Financial-class, owner-only; local to this machine. */
export const invoices = sqliteTable("invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => sqliteRowId()),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  clientId: text("client_id").notNull(),
  invoiceNumber: integer("invoice_number").notNull(),
  periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
  thresholdHours: integer("threshold_hours").notNull(),
  rateCents: integer("rate_cents").notNull(),
  billedSeconds: integer("billed_seconds").notNull(),
  carriedSeconds: integer("carried_seconds").notNull().default(0),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("accepted"),
  note: text("note"),
  voidedAt: integer("voided_at", { mode: "timestamp_ms" }),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
