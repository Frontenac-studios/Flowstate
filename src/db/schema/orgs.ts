import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Tenant boundary. Every user-owned row will hang off an org (added in the
 * follow-up PR that puts `org_id` on the tenant tables) — today the app has one
 * org per user and no UI that mentions them.
 *
 * Deliberately minimal: no slug, no settings, no billing. Those are features;
 * this is the seam they'd attach to. See `src/db/tenancy.ts` for how org
 * membership will translate into visibility.
 */
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
