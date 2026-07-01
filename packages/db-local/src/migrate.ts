import type Database from "better-sqlite3";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'adulting',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_id_slug_idx ON projects (user_id, slug);
CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx ON projects (user_id, updated_at);

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

CREATE TABLE IF NOT EXISTS task_time_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS task_time_entries_user_id_updated_at_idx ON task_time_entries (user_id, updated_at);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  blocker_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS task_dependencies_user_blocker_blocked_idx ON task_dependencies (user_id, blocker_task_id, blocked_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_blocked_idx ON task_dependencies (user_id, blocked_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_blocker_idx ON task_dependencies (user_id, blocker_task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_user_id_updated_at_idx ON task_dependencies (user_id, updated_at);

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
  weekly_target INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, category)
);
CREATE INDEX IF NOT EXISTS category_settings_user_id_updated_at_idx ON category_settings (user_id, updated_at);

CREATE TABLE IF NOT EXISTS nudge_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  local_date TEXT NOT NULL,
  task_ids TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS nudge_events_user_id_kind_local_date_idx
  ON nudge_events (user_id, kind, local_date);
CREATE INDEX IF NOT EXISTS nudge_events_user_id_updated_at_idx ON nudge_events (user_id, updated_at);

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

CREATE TABLE IF NOT EXISTS bingo_cards (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  card_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  finalized_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS bingo_cards_user_id_card_year_idx ON bingo_cards (user_id, card_year);
CREATE INDEX IF NOT EXISTS bingo_cards_user_id_updated_at_idx ON bingo_cards (user_id, updated_at);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  bingo_card_id TEXT REFERENCES bingo_cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  obligation_desire TEXT,
  value_id TEXT,
  target_horizon TEXT,
  target_year INTEGER,
  target_quarter INTEGER,
  target_month INTEGER,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  cell_index INTEGER,
  state TEXT NOT NULL DEFAULT 'active',
  completed_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS goals_user_id_updated_at_idx ON goals (user_id, updated_at);
CREATE INDEX IF NOT EXISTS goals_bingo_card_id_idx ON goals (bingo_card_id);
CREATE UNIQUE INDEX IF NOT EXISTS goals_bingo_card_cell_idx ON goals (bingo_card_id, cell_index);

CREATE TABLE IF NOT EXISTS goal_milestones (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS goal_milestones_goal_id_idx ON goal_milestones (goal_id);
CREATE INDEX IF NOT EXISTS goal_milestones_user_id_updated_at_idx ON goal_milestones (user_id, updated_at);

CREATE TABLE IF NOT EXISTS quarter_themes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  phrase TEXT,
  focus_categories TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS quarter_themes_user_year_quarter_idx ON quarter_themes (user_id, year, quarter);
CREATE INDEX IF NOT EXISTS quarter_themes_user_id_updated_at_idx ON quarter_themes (user_id, updated_at);

CREATE TABLE IF NOT EXISTS month_intentions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS month_intentions_user_year_month_category_idx
  ON month_intentions (user_id, year, month, category);
CREATE INDEX IF NOT EXISTS month_intentions_user_id_updated_at_idx ON month_intentions (user_id, updated_at);

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

CREATE TABLE IF NOT EXISTS planning_suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS planning_suggestions_user_surface_status_idx
  ON planning_suggestions (user_id, surface, status);
CREATE INDEX IF NOT EXISTS planning_suggestions_user_id_updated_at_idx ON planning_suggestions (user_id, updated_at);

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

CREATE TABLE IF NOT EXISTS user_values (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS user_values_user_id_updated_at_idx ON user_values (user_id, updated_at);

CREATE TABLE IF NOT EXISTS about_me_sections (
  user_id TEXT NOT NULL,
  section TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, section)
);

CREATE TABLE IF NOT EXISTS user_constraints (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  schedule TEXT,
  severity TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'user',
  source_text TEXT,
  learned_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS user_constraints_user_id_updated_at_idx ON user_constraints (user_id, updated_at);

CREATE TABLE IF NOT EXISTS about_me_suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  target_section TEXT NOT NULL,
  payload TEXT NOT NULL,
  source_text TEXT,
  learned_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS about_me_suggestions_user_target_status_idx
  ON about_me_suggestions (user_id, target_section, status);
CREATE INDEX IF NOT EXISTS about_me_suggestions_user_id_updated_at_idx
  ON about_me_suggestions (user_id, updated_at);

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
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, reflection_date TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'daily',
  prompt_text TEXT NOT NULL, body_text TEXT, mood INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS care_reflections_user_date_scope_idx ON care_reflections (user_id, reflection_date, scope);
CREATE INDEX IF NOT EXISTS care_reflections_user_id_updated_at_idx ON care_reflections (user_id, updated_at);

CREATE TABLE IF NOT EXISTS daily_wins (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  win_date TEXT NOT NULL,
  slot INTEGER,
  source TEXT NOT NULL,
  ref_id TEXT,
  label TEXT,
  state TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_wins_user_id_win_date_idx ON daily_wins (user_id, win_date);
CREATE INDEX IF NOT EXISTS daily_wins_user_id_updated_at_idx ON daily_wins (user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS daily_wins_user_date_slot_accepted_uidx ON daily_wins (user_id, win_date, slot);
CREATE UNIQUE INDEX IF NOT EXISTS daily_wins_user_date_ref_dismissed_uidx ON daily_wins (user_id, win_date, ref_id);

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
`;

// SQLite has no "ADD COLUMN IF NOT EXISTS", so add each new column only when the
// table doesn't already have it — keeps existing local DBs (created before these
// columns) in sync without a versioned-migration table. All identifiers below are
// hardcoded constants, never user input.
const ADDED_COLUMNS: ReadonlyArray<{ table: string; column: string; definition: string }> = [
  { table: "tasks", column: "category", definition: "TEXT" },
  { table: "tasks", column: "category_unresolved", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "tasks", column: "milestone_id", definition: "TEXT" },
  { table: "tasks", column: "time_estimate_minutes", definition: "INTEGER" },
  { table: "tasks", column: "care_activity_id", definition: "TEXT" },
  { table: "care_activities", column: "lifts_me", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "app_settings", column: "last_used_category", definition: "TEXT" },
  {
    table: "app_settings",
    column: "notifications_enabled",
    definition: "INTEGER NOT NULL DEFAULT 1",
  },
  { table: "app_settings", column: "focus_dnd_enabled", definition: "INTEGER NOT NULL DEFAULT 1" },
  { table: "app_settings", column: "abyss_archive_after_days", definition: "INTEGER" },
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
}
