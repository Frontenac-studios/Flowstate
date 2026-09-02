import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Tenant boundary. Every user-owned row will hang off an org (added in the
 * follow-up PR that puts `org_id` on the tenant tables) — today the app has one
 * org per user and no UI that mentions them.
 *
 * Deliberately minimal: no slug, no settings, no billing. Those are features;
 * this is the seam they'd attach to. See `src/db/tenancy.ts` for how org
 * membership will translate into visibility.
 */
export const orgs = pgTable(
  "orgs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /**
     * Set only on the org auto-created for a user who had none — the "Personal"
     * org from `ensureOrgForUser` or the `handle_new_user_org` trigger. Null for
     * any org that is not somebody's implicit personal one (and for the orgs
     * that predate this column; see drizzle/0059).
     *
     * The unique index is the whole point: it is what makes bootstrapping
     * idempotent under concurrency. The app fires several tRPC batches on first
     * page load, and without it each one created its own org, leaving the user
     * with two memberships and a context that hard-errors on every subsequent
     * request. Nulls are distinct in Postgres and SQLite alike, so this
     * constrains only the implicit personal orgs — real many-to-many membership
     * is untouched.
     */
    personalForUserId: uuid("personal_for_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("orgs_personal_for_user_id_idx").on(table.personalForUserId)]
);
