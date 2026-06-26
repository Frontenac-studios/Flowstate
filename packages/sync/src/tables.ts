export const SYNC_TABLES = [
  "projects",
  "phases",
  "protected_block_templates",
  "protected_blocks",
  "bingo_cards",
  "goals",
  "goal_milestones",
  "quarter_themes",
  "month_intentions",
  "reserved_days",
  "planning_suggestions",
  "tasks",
  "task_time_entries",
  "task_dependencies",
  "task_recurrence",
  "task_occurrence_overrides",
  "chat_messages",
  "day_reviews",
  "app_settings",
  "category_settings",
  "nudge_events",
  "task_bulk_imports",
  "task_bulk_import_items",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

export type SyncOp = "insert" | "update" | "delete";
