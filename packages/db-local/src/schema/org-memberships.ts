import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

// Value tuple duplicated from the Postgres `org_role` enum — this package can't
// import the Next app's schema (same pattern as PROJECT_CATEGORIES / CARE_THEMES).
export const ORG_ROLES = ["owner", "partner", "member"] as const;

/** SQLite mirror of the Postgres `org_memberships`. Local-only; not synced. */
export const orgMemberships = sqliteTable(
  "org_memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    orgId: text("org_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role", { enum: ORG_ROLES }).notNull().default("member"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("org_memberships_org_id_user_id_idx").on(table.orgId, table.userId),
    index("org_memberships_user_id_idx").on(table.userId),
  ]
);
