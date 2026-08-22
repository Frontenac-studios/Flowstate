import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { clients } from "./clients";
import { projects } from "./projects";

/**
 * A billing rate. This is the ONLY table in v1 classified `financial` (see
 * src/db/tenancy.ts): a Member never reads it, so money never has to appear as a
 * column on a table a Member can read. That single rule is what keeps
 * column-level security unnecessary.
 *
 * A rate is always attached to a client, and optionally narrowed to one project.
 * The project-scoped rate wins over the client-scoped one — that ladder lives in
 * one place, `resolveRateCents` in src/lib/rates/resolve-rate.ts.
 *
 * `effectiveFrom` lets a rate change over time without losing history: resolution
 * takes the most recent rate whose `effectiveFrom` has passed. Amounts are stored
 * in integer cents — never floats.
 */
export const rates = pgTable(
  "rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Null = the client's default rate; set = a rate that applies to one project only. */
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("rates_user_id_client_id_idx").on(table.userId, table.clientId),
    index("rates_user_id_project_id_idx").on(table.userId, table.projectId),
  ]
);
