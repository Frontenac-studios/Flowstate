import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/**
 * SQLite mirror of the Postgres `orgs`.
 *
 * Unlike the other mirrored tables this one is NOT in SYNC_TABLES — orgs are
 * resolved per-runtime, not pushed to hosted. It exists locally only so the
 * desktop app (which runs the same tRPC context code under the auth bypass) can
 * resolve an org without a network round-trip.
 */
export const orgs = sqliteTable(
  "orgs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    name: text("name").notNull(),
    /**
     * Mirrors `orgs.personal_for_user_id`. The unique index is load-bearing here
     * too: better-sqlite3 has no usable transaction for the async bootstrap path,
     * so the constraint — not a transaction — is what keeps concurrent
     * first-requests from each creating their own org.
     */
    personalForUserId: text("personal_for_user_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [uniqueIndex("orgs_personal_for_user_id_idx").on(table.personalForUserId)]
);
