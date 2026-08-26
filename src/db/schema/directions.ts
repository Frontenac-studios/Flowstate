import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A Direction is a durable rule for saying no — "we serve early-stage teams
 * shipping production software; we don't take design-only work." It is `org_shared`
 * (see src/db/tenancy.ts).
 *
 * There is deliberately **no progress column**. The absence is the assertion: a
 * Direction is applied, never measured (discovery §2). The moment it grows a bar it
 * has become a Target. Its only sub-content on Quarter is the "applied line" — a
 * count of how the Filter (W10) used it — which is derived, not stored here.
 *
 * Cap 1–2 active, enforced in the mutation. "Retire" stamps `retiredAt`; a Direction
 * is never deleted, because a door you closed is worth being able to see you closed.
 */
export const directions = pgTable(
  "directions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    /** The rule, written as a sentence and edited in place. */
    statement: text("statement").notNull(),
    /** Mirrors `retiredAt` for cheap filtering; retire sets both. No delete. */
    active: boolean("active").notNull().default(true),
    /** Soft-retire marker. Non-null drops it from the surface; it stays in the record. */
    retiredAt: timestamp("retired_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("directions_user_id_active_idx").on(table.userId, table.active)]
);
