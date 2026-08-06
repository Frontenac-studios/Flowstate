/**
 * Visibility classification for every tenant table.
 *
 * This is the multi-tenancy foundation's one piece of *encoded* policy. Nothing
 * enforces it yet — no middleware, no RLS predicate, no UI reads it — but when
 * the Partner and Member roles land, they are defined in terms of these classes
 * rather than in terms of a hand-maintained list of table names:
 *
 *   owner   — everything in their org.
 *   partner — everything except another user's PERSONAL rows.
 *   member  — their own (and later, assigned) ORG_SHARED rows. No FINANCIAL.
 *
 * So `partner` is *definitionally* "not PERSONAL", and `member` is
 * "ORG_SHARED, filtered by user". The map below is the boundary itself, not
 * documentation about it.
 *
 * TIE-BREAKER: when a table could plausibly go either way, classify it
 * PERSONAL. Misclassifying toward PERSONAL costs a future migration;
 * misclassifying toward ORG_SHARED costs a privacy leak the day a second person
 * joins. `protected_blocks`, `quarter_themes`, `month_intentions` and
 * `week_day_priorities` are all judgment calls resolved this way — they are
 * about how one person shapes their own time, not about the work itself.
 */

import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

import * as schema from "./schema";

export const VISIBILITY_CLASSES = ["personal", "org_shared", "financial"] as const;

export type VisibilityClass = (typeof VISIBILITY_CLASSES)[number];

/**
 * Tables with no tenant boundary at all — no `user_id`, no `org_id`, never will
 * have either. `health_checks` is an ops liveness probe.
 */
export const GLOBAL_TABLES = ["health_checks"] as const;

/**
 * The tenancy machinery itself. These carry `org_id`/`user_id` semantics but are
 * not user data, are not synced to the desktop mirror as ordinary rows, and are
 * not classified.
 */
export const ORG_INFRA_TABLES = ["orgs", "org_memberships"] as const;

/**
 * Every tenant table, classified. The test in `tenancy.test.ts` asserts this map
 * is total over the Drizzle schema, so a new table cannot be added without a
 * deliberate classification decision.
 *
 * FINANCIAL is empty today and that is the point: rates, revenue and invoices
 * get their *own* tables when they arrive, never columns on `projects` or
 * `tasks`. That single rule is what keeps column-level security permanently
 * unnecessary — a Member's `SELECT *` cannot leak a rate that does not live in
 * the table they can read.
 */
export const TABLE_VISIBILITY: Readonly<Record<string, VisibilityClass>> = {
  // ---- PERSONAL: artifacts about the person, not the work. ----
  // Reflection, wellbeing, private ritual, personal preference, connected
  // accounts, and the shape of one's own day. A Partner never sees these.
  about_me_sections: "personal",
  about_me_suggestions: "personal",
  abyss_items: "personal",
  app_settings: "personal",
  bingo_cards: "personal",
  calendar_connections: "personal",
  care_activities: "personal",
  care_events: "personal",
  care_reflections: "personal",
  category_settings: "personal",
  chat_custom_suggestions: "personal",
  chat_messages: "personal",
  daily_wins: "personal",
  day_reviews: "personal",
  evidence_editions: "personal",
  external_calendar_events: "personal",
  focus_blocks: "personal",
  month_intentions: "personal",
  nudge_events: "personal",
  protected_block_templates: "personal",
  protected_blocks: "personal",
  quarter_themes: "personal",
  reserved_days: "personal",
  user_constraints: "personal",
  user_values: "personal",
  week_day_priorities: "personal",
  week_reviews: "personal",

  // ---- ORG_SHARED: artifacts about the work itself. ----
  // What needs doing, for which project, by whom. Still filtered to the owning
  // user today — the class only says a Partner *could* be granted read later.
  goal_milestones: "org_shared",
  goals: "org_shared",
  phases: "org_shared",
  planning_suggestions: "org_shared",
  project_milestones: "org_shared",
  project_similarity: "org_shared",
  project_templates: "org_shared",
  projects: "org_shared",
  task_bulk_import_items: "org_shared",
  task_bulk_imports: "org_shared",
  task_dependencies: "org_shared",
  task_occurrence_overrides: "org_shared",
  task_recurrence: "org_shared",
  task_time_entries: "org_shared",
  tasks: "org_shared",

  // ---- FINANCIAL: intentionally empty. ----
  // See the doc comment above: new tables, never new columns.
};

/**
 * `goals` is ORG_SHARED but FKs to `bingo_cards`, which is PERSONAL. This
 * cross-class edge is intentional and safe — RLS evaluates each table
 * independently, so a Partner reading a Member's goal simply gets nothing back
 * for the card. Do not "fix" it by reclassifying either side.
 */
export const DOCUMENTED_CROSS_CLASS_EDGES = [
  { from: "goals", to: "bingo_cards", reason: "goal may sit on a personal annual bingo card" },
] as const;

/**
 * All Drizzle table names reachable from the schema barrel, including global and
 * infra tables.
 *
 * Note for the totality check: this trusts `schema/index.ts` to re-export every
 * table file. It didn't, once (`task-dependencies` was missing), so
 * `tenancy.test.ts` scans the directory instead of relying on this.
 */
export function allSchemaTableNames(): string[] {
  // Cast to unknown[] so `filter` can narrow: the barrel's value union is a union
  // of specific table/enum types, and `PgTable` isn't assignable to it.
  return (Object.values(schema) as unknown[]).filter(isPgTable).map((table) => getTableName(table));
}

/**
 * Narrows through `unknown` on purpose: the schema barrel exports enums and
 * types alongside tables, and a predicate typed against that union isn't
 * assignable to its own parameter.
 */
export function isPgTable(value: unknown): value is PgTable {
  return is(value, PgTable);
}

export function visibilityOf(tableName: string): VisibilityClass | undefined {
  return TABLE_VISIBILITY[tableName];
}

export function tablesInClass(visibility: VisibilityClass): string[] {
  return Object.entries(TABLE_VISIBILITY)
    .filter(([, value]) => value === visibility)
    .map(([name]) => name)
    .sort();
}
