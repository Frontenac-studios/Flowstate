import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A client is who the work is for. It is `org_shared` (see src/db/tenancy.ts): a
 * Partner may be granted read later, a Member never sees another user's rows.
 *
 * Money is deliberately NOT here. A client's rate lives in the `financial`-class
 * `rates` table (see ./rates.ts), never as a column here — so a Member's
 * `SELECT *` on `clients` cannot leak a rate. The tenancy test enforces this.
 */
export const clientStatus = pgEnum("client_status", ["active", "archived"]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    name: text("name").notNull(),
    /** ISO 4217 code (e.g. "USD", "GBP"). A denomination label, not an amount. */
    currency: text("currency").notNull().default("USD"),
    /** Mirrors `archivedAt` for cheap filtering; archive sets both. No delete. */
    status: clientStatus("status").notNull().default("active"),
    notes: text("notes"),
    /** Soft-archive marker. Non-null hides the client from the index; data is retained. */
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("clients_user_id_status_idx").on(table.userId, table.status),
    index("clients_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
