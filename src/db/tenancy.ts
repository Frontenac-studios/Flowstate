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
 * joins. `protected_blocks` and `week_day_priorities` are judgment calls resolved this way — they are
 * about how one person shapes their own time, not about the work itself.
 */

import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

import * as schema from "./schema";

export const VISIBILITY_CLASSES = ["personal", "org_shared", "financial"] as const;

export type VisibilityClass = (typeof VISIBILITY_CLASSES)[number];

/**
 * Tables with no tenant boundary at all — no `user_id`, no `org_id`, never will
 * have either. Empty since `health_checks` was removed in the v1 teardown; kept
 * because the totality check in `tenancy.test.ts` needs somewhere to put a table
 * that is deliberately outside the boundary rather than merely unclassified.
 */
export const GLOBAL_TABLES: readonly string[] = [];

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
 * FINANCIAL holds money that a Member never reads: rates, expenses, the draw
 * settings — and later revenue and invoices — get their *own* tables when they
 * arrive, never columns on `projects` or `tasks`. That single rule is what keeps
 * column-level security permanently unnecessary — a Member's `SELECT *` cannot
 * leak a rate that does not live in the table they can read.
 */
export const TABLE_VISIBILITY: Readonly<Record<string, VisibilityClass>> = {
  // ---- PERSONAL: artifacts about the person, not the work. ----
  // Reflection, wellbeing, private ritual, personal preference, connected
  // accounts, and the shape of one's own day. A Partner never sees these.
  abyss_items: "personal",
  app_settings: "personal",
  calendar_connections: "personal",
  care_activities: "personal",
  care_events: "personal",
  care_reflections: "personal",
  category_settings: "personal",
  chat_custom_suggestions: "personal",
  chat_messages: "personal",
  day_reviews: "personal",
  external_calendar_events: "personal",
  focus_blocks: "personal",
  protected_block_templates: "personal",
  protected_blocks: "personal",
  reserved_days: "personal",
  week_day_priorities: "personal",
  week_reviews: "personal",

  // ---- ORG_SHARED: artifacts about the work itself. ----
  // What needs doing, for which project, by whom. Still filtered to the owning
  // user today — the class only says a Partner *could* be granted read later.
  clients: "org_shared",
  // Quarter surface (W5): a Direction is a shared rule for the work; a Target is a
  // shared bet. Money never lands here — an `auto` Target's current value is derived
  // at read from the financial source, never written onto the row (see targets.ts).
  directions: "org_shared",
  targets: "org_shared",
  // Sourcing agent (W10): leads are research artifacts about the market, ICP config
  // describes the work — org_shared, never personal. No money column lives on any of
  // these (proposal money goes financial-class); a member's SELECT * leaks no rate.
  leads: "org_shared",
  lead_outreach: "org_shared",
  sourcing_settings: "org_shared",
  phases: "org_shared",
  project_milestones: "org_shared",
  project_templates: "org_shared",
  projects: "org_shared",
  task_bulk_import_items: "org_shared",
  task_bulk_imports: "org_shared",
  task_occurrence_overrides: "org_shared",
  task_recurrence: "org_shared",
  tasks: "org_shared",
  // A tag is invoice structure — the shape of the work, not money. The billable
  // flag and the amount live on `time_entries` (financial), never here.
  time_tags: "org_shared",

  // ---- FINANCIAL: money a Member never reads. ----
  // Rates, expenses, the draw settings, the time log (and later revenue, invoices)
  // get their own tables here rather than a column on `projects` or `clients`. That
  // is what keeps column-level security unnecessary — a Member's `SELECT *` cannot
  // leak a rate that is not in the table they can read.
  //
  // `business_expenses` and `money_settings` are the Draw-panel pipe (discovery
  // decision 2.7): laid now, read by the panel later. `time_entries` (renamed from
  // task_time_entries in W2) joined when it gained `billable` and `invoiced_at`; the
  // v1.1 split — org_shared work-facts + a financial billing sidecar — is deferred
  // until members exist, so for now the whole row is owner-only (decision B).
  business_expenses: "financial",
  // Accepted invoices and their line items (W4) — revenue a Member never reads.
  invoices: "financial",
  invoice_lines: "financial",
  money_settings: "financial",
  // Sealed fortnights (W8) — the frozen tilt read; the breakdown carries client
  // names against logged seconds, so a Member never reads it.
  ledger_periods: "financial",
  // Owner's draws (W16) — the personal-side withdrawal, revenue a Member never reads.
  owner_draws: "financial",
  rates: "financial",
  time_entries: "financial",
};

/**
 * Cross-class FK edges that are intentional and safe: RLS evaluates each table
 * independently, so a reader who can see one side and not the other simply gets
 * nothing back for the other. Empty since the `goals` -> `bingo_cards` edge was
 * removed with the bingo layer. Record new ones here rather than "fixing" them
 * by reclassifying either side.
 */
export const DOCUMENTED_CROSS_CLASS_EDGES: readonly {
  from: string;
  to: string;
  reason: string;
}[] = [];

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
