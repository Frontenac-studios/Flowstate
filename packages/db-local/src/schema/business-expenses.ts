import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/business-expenses.ts. Financial-class, owner-only. */
export const businessExpenses = sqliteTable(
  "business_expenses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),
    category: text("category"),
    incurredOn: integer("incurred_on", { mode: "timestamp_ms" }).notNull(),
    source: text("source")
      .notNull()
      .$defaultFn(() => "manual"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [uniqueIndex("business_expenses_id_idx").on(table.id)]
);
