import type Database from "better-sqlite3";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'personal',
  client_id TEXT,
  state TEXT NOT NULL DEFAULT 'active',
  is_maintenance INTEGER NOT NULL DEFAULT 0,
  target_id TEXT,
  is_learning INTEGER NOT NULL DEFAULT 0,
  capability TEXT,
  why TEXT,
  reached_at INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_id_slug_idx ON projects (user_id, slug);
CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx ON projects (user_id, updated_at);
-- The projects_user_id_client_id_idx index is created AFTER the ADDED_COLUMNS loop
-- (see runSqliteMigrations): on a pre-existing local DB, client_id is added there,
-- so an index referencing it here would fail with "no such column: client_id".

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS clients_user_id_status_idx ON clients (user_id, status);
CREATE INDEX IF NOT EXISTS clients_user_id_updated_at_idx ON clients (user_id, updated_at);

CREATE TABLE IF NOT EXISTS rates (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  effective_from INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rates_user_id_client_id_idx ON rates (user_id, client_id);
CREATE INDEX IF NOT EXISTS rates_user_id_project_id_idx ON rates (user_id, project_id);

-- Financial-class Draw-panel pipe (W1.5). Owner-only; mirrored from
-- src/db/schema/{business-expenses,money-settings}.ts.
CREATE TABLE IF NOT EXISTS business_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  category TEXT,
  incurred_on INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS business_expenses_user_id_incurred_on_idx
  ON business_expenses (user_id, incurred_on);

CREATE TABLE IF NOT EXISTS money_settings (
  user_id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  tax_reserve_percent INTEGER,
  cost_of_living_cents INTEGER,
  personal_savings_cents INTEGER,
  minimum_draw_cents INTEGER,
  bank_balance_cents INTEGER,
  bank_balance_reconciled_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Accepted invoices + line items (W4). Financial-class; mirrored from
-- src/db/schema/{invoices,invoice-lines}.ts.
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  invoice_number INTEGER NOT NULL,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  threshold_hours INTEGER NOT NULL,
  rate_cents INTEGER NOT NULL,
  billed_seconds INTEGER NOT NULL,
  carried_seconds INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  note TEXT,
  voided_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invoices_user_id_client_id_idx ON invoices (user_id, client_id);
CREATE INDEX IF NOT EXISTS invoices_user_id_created_at_idx ON invoices (user_id, created_at);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  billed_seconds INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invoice_lines_invoice_id_idx ON invoice_lines (invoice_id);

-- Owner's draws (W16). Financial-class; mirrored from src/db/schema/owner-draws.ts.
CREATE TABLE IF NOT EXISTS ledger_periods (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  tilt_business_pct INTEGER,
  business_seconds INTEGER NOT NULL,
  personal_seconds INTEGER NOT NULL,
  breakdown TEXT NOT NULL,
  sealed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_periods_user_id_period_start_idx
  ON ledger_periods (user_id, period_start);

CREATE TABLE IF NOT EXISTS owner_draws (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  drawn_on INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS owner_draws_user_id_drawn_on_idx ON owner_draws (user_id, drawn_on);

CREATE TABLE IF NOT EXISTS project_templates (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  structure TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS project_templates_user_id_updated_at_idx
  ON project_templates (user_id, updated_at);
CREATE INDEX IF NOT EXISTS project_templates_user_id_name_idx
  ON project_templates (user_id, name);

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_phase_id TEXT REFERENCES phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS phases_user_id_project_id_idx ON phases (user_id, project_id);
CREATE INDEX IF NOT EXISTS phases_parent_phase_id_idx ON phases (parent_phase_id);
CREATE INDEX IF NOT EXISTS phases_user_id_updated_at_idx ON phases (user_id, updated_at);

CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS project_milestones_user_id_project_id_idx ON project_milestones (user_id, project_id);
CREATE INDEX IF NOT EXISTS project_milestones_user_id_target_date_idx ON project_milestones (user_id, target_date);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  scheduled_date TEXT,
  bucket_override TEXT,
  category TEXT,
  category_unresolved INTEGER NOT NULL DEFAULT 0,
  is_top_3 INTEGER NOT NULL DEFAULT 0,
  top_3_order INTEGER,
  top_3_pinned_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_user_id_scheduled_date_idx ON tasks (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS tasks_user_id_updated_at_idx ON tasks (user_id, updated_at);

-- W2: task_time_entries was renamed to time_entries and reshaped (project-scoped,
-- task optional, billable/source/invoiced_at). The local mirror is re-syncable and
-- pending writes live in sync_mutations, so drop the old table and recreate fresh
-- rather than fight SQLite's inability to drop a NOT NULL on task_id. A full re-pull
-- repopulates it.
DROP TABLE IF EXISTS task_time_entries;

CREATE TABLE IF NOT EXISTS time_tags (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS time_tags_user_id_name_idx ON time_tags (user_id, name);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT,
  tag_id TEXT REFERENCES time_tags(id) ON DELETE SET NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  billable INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  invoiced_at INTEGER,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS time_entries_user_id_updated_at_idx ON time_entries (user_id, updated_at);
CREATE INDEX IF NOT EXISTS time_entries_user_id_started_at_idx ON time_entries (user_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_user_id_project_id_idx ON time_entries (user_id, project_id);

CREATE TABLE IF NOT EXISTS task_recurrence (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  rrule TEXT NOT NULL,
  start_date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS task_recurrence_task_id_idx ON task_recurrence (task_id);
CREATE INDEX IF NOT EXISTS task_recurrence_user_id_updated_at_idx ON task_recurrence (user_id, updated_at);

CREATE TABLE IF NOT EXISTS task_occurrence_overrides (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  recurrence_id TEXT NOT NULL REFERENCES task_recurrence(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  status TEXT NOT NULL,
  moved_to_date TEXT,
  patch TEXT,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS task_occurrence_overrides_recurrence_date_idx
  ON task_occurrence_overrides (recurrence_id, occurrence_date);
CREATE INDEX IF NOT EXISTS task_occurrence_overrides_user_id_updated_at_idx
  ON task_occurrence_overrides (user_id, updated_at);

CREATE TABLE IF NOT EXISTS protected_block_templates (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  iso_weekday INTEGER NOT NULL,
  label TEXT,
  start_min INTEGER,
  end_min INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS protected_block_templates_user_id_updated_at_idx
  ON protected_block_templates (user_id, updated_at);
CREATE INDEX IF NOT EXISTS protected_block_templates_user_id_iso_weekday_idx
  ON protected_block_templates (user_id, iso_weekday);

CREATE TABLE IF NOT EXISTS protected_blocks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  label TEXT,
  start_min INTEGER,
  end_min INTEGER,
  template_id TEXT REFERENCES protected_block_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS protected_blocks_user_id_scheduled_date_idx
  ON protected_blocks (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS protected_blocks_user_id_updated_at_idx
  ON protected_blocks (user_id, updated_at);

CREATE TABLE IF NOT EXISTS week_day_priorities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  priority_order INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS week_day_priorities_user_id_scheduled_date_idx
  ON week_day_priorities (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS week_day_priorities_user_id_updated_at_idx
  ON week_day_priorities (user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS week_day_priorities_user_date_slot_uidx
  ON week_day_priorities (user_id, scheduled_date, priority_order);
CREATE UNIQUE INDEX IF NOT EXISTS week_day_priorities_user_task_date_uidx
  ON week_day_priorities (user_id, task_id, scheduled_date);

CREATE TABLE IF NOT EXISTS focus_blocks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_min INTEGER NOT NULL,
  end_min INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS focus_blocks_user_id_date_idx ON focus_blocks (user_id, date);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_thread_id_created_at_idx
  ON chat_messages (user_id, thread_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_updated_at_idx ON chat_messages (user_id, updated_at);

CREATE TABLE IF NOT EXISTS day_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT,
  top_3_status TEXT,
  reflection_text TEXT,
  reflective_question TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS day_reviews_user_id_date_idx ON day_reviews (user_id, date);
CREATE INDEX IF NOT EXISTS day_reviews_user_id_updated_at_idx ON day_reviews (user_id, updated_at);

CREATE TABLE IF NOT EXISTS app_settings (
  user_id TEXT PRIMARY KEY NOT NULL,
  bucket_mode TEXT NOT NULL DEFAULT 'relative',
  day_start_hour INTEGER NOT NULL DEFAULT 7,
  day_end_hour INTEGER NOT NULL DEFAULT 19,
  last_used_category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS category_settings (
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  label TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, category)
);
CREATE INDEX IF NOT EXISTS category_settings_user_id_updated_at_idx ON category_settings (user_id, updated_at);

CREATE TABLE IF NOT EXISTS task_bulk_imports (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  undone_at INTEGER
);
CREATE INDEX IF NOT EXISTS task_bulk_imports_user_id_project_id_created_at_idx
  ON task_bulk_imports (user_id, project_id, created_at);
CREATE INDEX IF NOT EXISTS task_bulk_imports_user_id_updated_at_idx ON task_bulk_imports (user_id, updated_at);

CREATE TABLE IF NOT EXISTS task_bulk_import_items (
  import_id TEXT NOT NULL REFERENCES task_bulk_imports(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (import_id, task_id)
);
CREATE INDEX IF NOT EXISTS task_bulk_import_items_user_id_updated_at_idx
  ON task_bulk_import_items (user_id, updated_at);

CREATE TABLE IF NOT EXISTS chat_custom_suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  user_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  label TEXT NOT NULL,
  send_count INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  promoted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_custom_suggestions_user_id_normalized_text_idx
  ON chat_custom_suggestions (user_id, normalized_text);

CREATE TABLE IF NOT EXISTS reserved_days (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  type TEXT NOT NULL,
  label TEXT,
  resolved_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reserved_days_user_year_month_idx ON reserved_days (user_id, year, month);
CREATE INDEX IF NOT EXISTS reserved_days_user_id_updated_at_idx ON reserved_days (user_id, updated_at);

CREATE TABLE IF NOT EXISTS abyss_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'idea',
  note TEXT,
  links TEXT,
  category TEXT,
  embedding TEXT,
  tags TEXT,
  source TEXT NOT NULL DEFAULT 'capture',
  status TEXT NOT NULL DEFAULT 'active',
  resurface_count INTEGER NOT NULL DEFAULT 0,
  last_resurfaced_at INTEGER,
  last_touched_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  promoted_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  promoted_target TEXT
);
CREATE INDEX IF NOT EXISTS abyss_items_user_id_status_idx ON abyss_items (user_id, status);
CREATE INDEX IF NOT EXISTS abyss_items_user_id_last_touched_at_idx ON abyss_items (user_id, last_touched_at);

CREATE TABLE IF NOT EXISTS care_activities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  kind TEXT,
  cadence TEXT,
  note TEXT,
  source TEXT NOT NULL,
  catalog_key TEXT,
  lifts_me INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS care_activities_user_id_updated_at_idx ON care_activities (user_id, updated_at);

CREATE TABLE IF NOT EXISTS care_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  activity_id TEXT REFERENCES care_activities(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'practice',
  meta TEXT,
  occurred_at INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS care_events_user_id_occurred_at_idx ON care_events (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS care_events_activity_id_idx ON care_events (activity_id);

CREATE TABLE IF NOT EXISTS care_reflections (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  reflection_date TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'daily',
  prompt_text TEXT NOT NULL,
  body_text TEXT NOT NULL DEFAULT '',
  mood INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS care_reflections_user_date_scope_uidx
  ON care_reflections (user_id, reflection_date, scope);
CREATE INDEX IF NOT EXISTS care_reflections_user_id_updated_at_idx
  ON care_reflections (user_id, updated_at);

CREATE TABLE IF NOT EXISTS sync_mutations (
  id TEXT PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  op TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS sync_mutations_synced_at_idx ON sync_mutations (synced_at);

CREATE TABLE IF NOT EXISTS sync_watermarks (
  table_name TEXT PRIMARY KEY NOT NULL,
  pulled_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_connections (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_email TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  token_expires_at INTEGER,
  selected_calendar_ids TEXT NOT NULL DEFAULT '[]',
  sync_cursor TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS calendar_connections_user_id_idx
  ON calendar_connections (user_id);
CREATE INDEX IF NOT EXISTS calendar_connections_user_id_updated_at_idx
  ON calendar_connections (user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_connections_user_id_provider_idx
  ON calendar_connections (user_id, provider);

CREATE TABLE IF NOT EXISTS external_calendar_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  connection_id TEXT NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  calendar_color TEXT,
  title TEXT,
  location TEXT,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  visibility TEXT NOT NULL DEFAULT 'default',
  recurrence_master_id TEXT,
  provider_updated_at INTEGER,
  etag TEXT,
  html_link TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS external_calendar_events_connection_calendar_event_idx
  ON external_calendar_events (connection_id, calendar_id, provider_event_id);
CREATE INDEX IF NOT EXISTS external_calendar_events_user_id_start_at_idx
  ON external_calendar_events (user_id, start_at);

-- Quarter surface (W5): Directions (durable rules) and Targets (the bets).
CREATE TABLE IF NOT EXISTS directions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  retired_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS directions_user_id_active_idx ON directions (user_id, active);

CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  direction_id TEXT NOT NULL,
  title TEXT NOT NULL,
  horizon TEXT NOT NULL DEFAULT 'quarter',
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  measure_kind TEXT NOT NULL,
  measure_source TEXT NOT NULL DEFAULT 'manual',
  derivation_key TEXT,
  measure_target INTEGER NOT NULL,
  measure_current INTEGER,
  state TEXT NOT NULL DEFAULT 'active',
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS targets_user_id_state_idx ON targets (user_id, state);
CREATE INDEX IF NOT EXISTS targets_direction_id_idx ON targets (direction_id);

-- Sourcing agent (W10): leads, ICP/voice config, and outreach drafts.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  segment TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  score INTEGER,
  confidence INTEGER,
  rank INTEGER,
  rationale TEXT,
  research TEXT,
  researched_at INTEGER,
  research_provider TEXT,
  state TEXT NOT NULL DEFAULT 'new',
  dismiss_reason TEXT,
  snooze_until INTEGER,
  run_id TEXT,
  project_id TEXT,
  direction_id TEXT,
  notes TEXT,
  closed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_user_id_state_idx ON leads (user_id, state);
CREATE INDEX IF NOT EXISTS leads_user_id_rank_idx ON leads (user_id, rank);

CREATE TABLE IF NOT EXISTS project_fees (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  proposal_amount_cents INTEGER,
  proposed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS project_fees_user_id_project_id_idx
  ON project_fees (user_id, project_id);
CREATE INDEX IF NOT EXISTS project_fees_project_id_idx ON project_fees (project_id);

CREATE TABLE IF NOT EXISTS sourcing_runs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'cron',
  status TEXT NOT NULL DEFAULT 'discovering',
  week_key TEXT NOT NULL,
  batch_size INTEGER NOT NULL,
  discovered INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  finished_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sourcing_runs_user_id_created_at_idx
  ON sourcing_runs (user_id, created_at);
CREATE INDEX IF NOT EXISTS sourcing_runs_user_id_week_key_idx
  ON sourcing_runs (user_id, week_key);

CREATE TABLE IF NOT EXISTS sourcing_run_costs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  amount_micros INTEGER NOT NULL DEFAULT 0,
  calls INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sourcing_run_costs_user_id_created_at_idx
  ON sourcing_run_costs (user_id, created_at);
CREATE INDEX IF NOT EXISTS sourcing_run_costs_run_id_idx
  ON sourcing_run_costs (run_id);

CREATE TABLE IF NOT EXISTS sourcing_settings (
  user_id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  segments TEXT,
  exclusions TEXT,
  weights TEXT,
  outreach_voice TEXT,
  weekly_run_enabled INTEGER NOT NULL DEFAULT 0,
  weekly_run_batch_size INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_outreach (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_outreach_lead_id_idx ON lead_outreach (lead_id);

-- Tenancy. Local-only: these are NOT in SYNC_TABLES. The desktop app runs the
-- same tRPC context code as web (under the auth bypass), so it needs to resolve
-- an org locally; hosted resolves its own from Supabase.
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  personal_for_user_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS org_memberships (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_org_id_user_id_idx
  ON org_memberships (org_id, user_id);
CREATE INDEX IF NOT EXISTS org_memberships_user_id_idx
  ON org_memberships (user_id);
`;

// SQLite has no "ADD COLUMN IF NOT EXISTS", so add each new column only when the
// table doesn't already have it — keeps existing local DBs (created before these
// columns) in sync without a versioned-migration table. All identifiers below are
// hardcoded constants, never user input.
const ADDED_COLUMNS: ReadonlyArray<{ table: string; column: string; definition: string }> = [
  // W10f — a lead's terminal-stage timestamp, on a mirror that predates the pipeline.
  { table: "leads", column: "closed_at", definition: "INTEGER" },
  // W10h — the researched company facts, their timestamp and their provenance.
  { table: "leads", column: "research", definition: "TEXT" },
  { table: "leads", column: "researched_at", definition: "INTEGER" },
  { table: "leads", column: "research_provider", definition: "TEXT" },
  // W10i — the weekly run's opt-in switch and batch size.
  {
    table: "sourcing_settings",
    column: "weekly_run_enabled",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  { table: "sourcing_settings", column: "weekly_run_batch_size", definition: "INTEGER" },
  { table: "tasks", column: "category", definition: "TEXT" },
  { table: "tasks", column: "category_unresolved", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "tasks", column: "time_estimate_minutes", definition: "INTEGER" },
  { table: "tasks", column: "care_activity_id", definition: "TEXT" },
  { table: "tasks", column: "tags", definition: "TEXT" },
  { table: "tasks", column: "suggested_scheduled_date", definition: "TEXT" },
  { table: "care_activities", column: "lifts_me", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "app_settings", column: "last_used_category", definition: "TEXT" },
  {
    table: "app_settings",
    column: "notifications_enabled",
    definition: "INTEGER NOT NULL DEFAULT 1",
  },
  { table: "app_settings", column: "focus_dnd_enabled", definition: "INTEGER NOT NULL DEFAULT 1" },
  { table: "app_settings", column: "abyss_archive_after_days", definition: "INTEGER" },
  {
    table: "app_settings",
    column: "top3_midday_checkin",
    definition: "TEXT NOT NULL DEFAULT 'on'",
  },
  {
    table: "app_settings",
    column: "assistance_enabled",
    definition: "INTEGER NOT NULL DEFAULT 1",
  },
  {
    table: "app_settings",
    column: "goal_coach_ambition",
    definition: "TEXT NOT NULL DEFAULT 'balanced'",
  },
  {
    table: "app_settings",
    column: "goal_coach_note",
    definition: "TEXT",
  },
  {
    table: "app_settings",
    column: "goal_coach_adaptations",
    definition: "TEXT",
  },
  {
    table: "app_settings",
    column: "alert_prefs",
    definition: "TEXT",
  },
  {
    table: "app_settings",
    column: "calendar_ai_enabled",
    definition: "INTEGER NOT NULL DEFAULT 1",
  },
  { table: "protected_blocks", column: "source", definition: "TEXT" },
  { table: "projects", column: "archived_at", definition: "INTEGER" },
  { table: "projects", column: "client_id", definition: "TEXT" },
  { table: "projects", column: "state", definition: "TEXT NOT NULL DEFAULT 'active'" },
  { table: "projects", column: "is_maintenance", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "projects", column: "target_id", definition: "TEXT" },
  { table: "projects", column: "is_learning", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "projects", column: "capability", definition: "TEXT" },
  { table: "projects", column: "why", definition: "TEXT" },
  { table: "projects", column: "reached_at", definition: "INTEGER" },
  // W7 — the Sweep: "kept until" marker on the three stale altitudes.
  { table: "tasks", column: "swept_kept_until", definition: "INTEGER" },
  { table: "projects", column: "swept_kept_until", definition: "INTEGER" },
  { table: "targets", column: "swept_kept_until", definition: "INTEGER" },
  { table: "app_settings", column: "quarter_first_run_at", definition: "INTEGER" },
  { table: "app_settings", column: "quarter_tilt_business_pct", definition: "INTEGER" },
  { table: "external_calendar_events", column: "calendar_color", definition: "TEXT" },
  { table: "time_entries", column: "invoice_id", definition: "TEXT" },
  { table: "invoices", column: "paid_at", definition: "INTEGER" },
  {
    table: "clients",
    column: "billing_threshold_hours",
    definition: "INTEGER NOT NULL DEFAULT 20",
  },
  // Marks the org auto-created for a user who had none; unique, so concurrent
  // first-requests can't each create one. Index built after the loop below.
  { table: "orgs", column: "personal_for_user_id", definition: "TEXT" },
];

function hasColumn(sqlite: Database.Database, table: string, column: string): boolean {
  const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return info.some((c) => c.name === column);
}

export function runSqliteMigrations(sqlite: Database.Database): void {
  sqlite.exec(MIGRATION_SQL);

  for (const { table, column, definition } of ADDED_COLUMNS) {
    if (!hasColumn(sqlite, table, column)) {
      const alterSql = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`;
      sqlite.exec(alterSql);
    }
  }

  // Indexes on columns that ADDED_COLUMNS may have only just created. These must
  // run after the loop, not inside MIGRATION_SQL, or a pre-existing local table
  // (created before the column) makes the index reference a missing column.
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS projects_user_id_client_id_idx ON projects (user_id, client_id);"
  );

  // The org-bootstrap guard, mirroring drizzle/0059. Same reason as the index
  // above: `personal_for_user_id` is added by the ADDED_COLUMNS loop, so a local
  // DB created before it would fail on "no such column" inside MIGRATION_SQL.
  // Existing rows are all NULL and NULLs are distinct, so this never conflicts —
  // including on a local DB already holding the two orgs this fixes.
  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS orgs_personal_for_user_id_idx ON orgs (personal_for_user_id);"
  );

  // W4 double-bill guard, mirroring the Postgres trigger in
  // drizzle/0050_time_entries_invoice_id_immutable.sql. `invoice_id` is write-once:
  // NULL -> invoice (bill) and invoice -> NULL (void releases) are allowed, but an
  // entry already billed can never be moved to a *different* invoice. Same reason
  // as `projects_user_id_client_id_idx` above, this runs after the ADDED_COLUMNS
  // loop — invoice_id is added there, so a trigger referencing it inside
  // MIGRATION_SQL would fail with "no such column" on a fresh DB.
  sqlite.exec(
    `CREATE TRIGGER IF NOT EXISTS time_entries_invoice_id_immutable
       BEFORE UPDATE OF invoice_id ON time_entries
       FOR EACH ROW
       WHEN OLD.invoice_id IS NOT NULL
            AND NEW.invoice_id IS NOT NULL
            AND NEW.invoice_id <> OLD.invoice_id
       BEGIN
         SELECT RAISE(
           ABORT,
           'time_entries.invoice_id is immutable once set; void the invoice to release the entry before re-billing'
         );
       END;`
  );
}
