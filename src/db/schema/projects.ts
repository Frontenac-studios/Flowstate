import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clients } from "./clients";

/**
 * Collapsed from the pre-mission five-value life-category enum
 * (professional | personal_projects | relationships | body_mind | adulting) to
 * two: work vs not-work. MISSION.md: "Personal work is a category, not a
 * subsystem." The migration maps professional→business and all four others→
 * personal (see drizzle/ for the reviewed SQL).
 */
export const projectCategory = pgEnum("project_category", ["business", "personal"]);

/** Where a project sits in its lifecycle. Distinct from the soft-archive marker. */
export const projectState = pgEnum("project_state", ["prospect", "active", "paused", "done"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: projectCategory("category").notNull(),
    /** Who the work is for. Null = internal or personal work, which has no client. */
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    state: projectState("state").notNull().default("active"),
    /**
     * A maintenance project (the personal category, recurring upkeep) requires no
     * target and is excluded from every goal-layer query. See
     * src/lib/projects/goal-layer.ts.
     */
    isMaintenance: boolean("is_maintenance").notNull().default(false),
    /** Soft-archive marker. Non-null hides the project from the index; data is retained. */
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_user_id_slug_idx").on(table.userId, table.slug),
    index("projects_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("projects_user_id_client_id_idx").on(table.userId, table.clientId),
  ]
);
