export const SYNC_TABLES = [
  "projects",
  "phases",
  "tasks",
  "task_time_entries",
  "chat_messages",
  "day_reviews",
  "app_settings",
  "nudge_events",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

export type SyncOp = "insert" | "update" | "delete";
