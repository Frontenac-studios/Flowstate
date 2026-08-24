export const SYNC_TABLES = [
  "abyss_items",
  "business_expenses",
  "clients",
  "money_settings",
  "rates",
  "projects",
  "project_templates",
  "phases",
  "project_milestones",
  "protected_block_templates",
  "protected_blocks",
  "week_day_priorities",
  "goals",
  "goal_milestones",
  "reserved_days",
  "tasks",
  "task_time_entries",
  "task_recurrence",
  "task_occurrence_overrides",
  "chat_messages",
  "day_reviews",
  "app_settings",
  "category_settings",
  "task_bulk_imports",
  "task_bulk_import_items",
  "care_activities",
  "care_events",
  "care_reflections",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

// "complete" is a task-only lane carrying just {id, completedAt, updatedAt}. It is
// coalesced and pushed separately from ordinary row upserts so that an unrelated
// edit's stale full-row snapshot can never revert a completion (and vice versa).
export type SyncOp = "insert" | "update" | "delete" | "complete";
