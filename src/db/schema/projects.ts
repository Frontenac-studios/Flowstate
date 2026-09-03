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
import { targets } from "./targets";

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

/**
 * How the work is sold (W15, discovery 4.3). A work-fact, not money — which is why
 * it may live here: it says how to READ the burn, not what anything is worth. The fee
 * amount and the target-rate floor are money and live in `project_fees` (financial).
 */
export const projectBillingType = pgEnum("project_billing_type", ["hourly", "fixed_fee"]);

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
    /**
     * The Target this project serves, or null (internal / maintenance / not yet
     * linked). A project serves at most one Target; the link is proposed at project
     * creation (W5). See src/db/schema/targets.ts.
     */
    targetId: uuid("target_id").references(() => targets.id, { onDelete: "set null" }),
    /**
     * The learning roadmap is a business project Quarter reads, not its own table
     * (discovery §13 Q7). `isLearning` marks the one active capability project;
     * `capability` is the statement, `why` the qualitative reason, `reachedAt` the
     * terminal "capability reached" state. Milestones reuse project phases; logged
     * time is ordinary project time. No hours quota, no effective-rate tie.
     */
    isLearning: boolean("is_learning").notNull().default(false),
    capability: text("capability"),
    why: text("why"),
    reachedAt: timestamp("reached_at", { withTimezone: true, mode: "date" }),
    /** Soft-archive marker. Non-null hides the project from the index; data is retained. */
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    /** W7 — the Sweep. now + ~30d when "kept"; suppresses from the stale list until then. */
    sweptKeptUntil: timestamp("swept_kept_until", { withTimezone: true, mode: "date" }),
    /**
     * W15 — how this work is sold. Hourly burn means "running hot" earns more revenue;
     * fixed-fee burn means the margin is evaporating. Same signal, opposite meaning.
     */
    billingType: projectBillingType("billing_type").notNull().default("hourly"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_user_id_slug_idx").on(table.userId, table.slug),
    index("projects_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("projects_user_id_client_id_idx").on(table.userId, table.clientId),
  ]
);
