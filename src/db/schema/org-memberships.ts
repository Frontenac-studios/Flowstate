import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { orgs } from "./orgs";

/**
 * Roles are stored but enforced nowhere: no middleware reads them, no procedure
 * branches on them, no UI renders them. Naming all three now means
 * `src/db/tenancy.ts` can be written against real role names instead of being
 * retrofitted, and adding the enforcement later touches policy code only.
 *
 * - owner   — everything, including their own personal rows.
 * - partner — everything except another user's PERSONAL-class rows.
 * - member  — their own (and later, assigned) ORG_SHARED rows; no FINANCIAL.
 */
export const orgRole = pgEnum("org_role", ["owner", "partner", "member"]);

/**
 * Many-to-many so a user can belong to more than one org later without a
 * migration. Today every user has exactly one row here; the tRPC context throws
 * loudly rather than guessing if that ever stops being true (see
 * `resolveOrgContext`).
 *
 * The `(org_id, user_id)` unique index is load-bearing beyond dedup: the next PR
 * points `tasks.assigned_user_id` / `projects.assigned_user_id` at it via a
 * composite FK, so an assignee is guaranteed to be a member of the same org.
 */
export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: orgRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("org_memberships_org_id_user_id_idx").on(table.orgId, table.userId),
    index("org_memberships_user_id_idx").on(table.userId),
  ]
);
