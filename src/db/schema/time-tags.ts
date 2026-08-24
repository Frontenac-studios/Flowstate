import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A controlled tag the user manages in Settings (`Development`, `Meetings`,
 * `Revisions`, …). Time entries reference one via `time_entries.tag_id`.
 *
 * Deliberately a controlled list, not free text on the entry: a tag is invoice
 * structure, and a typo becomes a wrong invoice line. Classified `org_shared`
 * (see src/db/tenancy.ts) — it describes the shape of the work, not money.
 */
export const timeTags = pgTable(
  "time_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("time_tags_user_id_name_idx").on(table.userId, table.name)]
);
