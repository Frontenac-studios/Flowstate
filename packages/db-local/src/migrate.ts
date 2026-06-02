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
  is_top_3 INTEGER NOT NULL DEFAULT 0,
  top_3_order INTEGER,
  top_3_pinned_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_user_id_scheduled_date_idx ON tasks (user_id, scheduled_date);

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

CREATE TABLE IF NOT EXISTS app_settings (
  user_id TEXT PRIMARY KEY NOT NULL,
  bucket_mode TEXT NOT NULL DEFAULT 'relative',
  day_start_hour INTEGER NOT NULL DEFAULT 7,
  day_end_hour INTEGER NOT NULL DEFAULT 19,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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

CREATE TABLE IF NOT EXISTS task_bulk_import_items (
  import_id TEXT NOT NULL REFERENCES task_bulk_imports(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (import_id, task_id)
);
CREATE INDEX IF NOT EXISTS task_bulk_import_items_user_id_updated_at_idx
  ON task_bulk_import_items (user_id, updated_at);

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

export function runSqliteMigrations(sqlite: Database.Database): void {
  sqlite.exec(MIGRATION_SQL);
}
