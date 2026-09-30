export const SYNC_TABLES = [
  "abyss_items",
  "business_expenses",
  "clients",
  "directions",
  "targets",
  "leads",
  "lead_outreach",
  "sourcing_settings",
  "sourcing_runs",
  "sourcing_run_costs",
  "invoices",
  "invoice_lines",
  "money_settings",
  "ledger_periods",
  "owner_draws",
  "rates",
  "projects",
  "project_fees",
  "project_templates",
  "phases",
  "project_milestones",
  // After projects, project_milestones and invoices: the SQLite mirror enforces FKs.
  "fee_installments",
  "protected_block_templates",
  "protected_blocks",
  "week_day_priorities",
  "reserved_days",
  "tasks",
  "task_checklist_items",
  "task_tag_styles",
  "time_entries",
  "time_tags",
  "task_recurrence",
  "task_occurrence_overrides",
  "chat_messages",
  "day_reviews",
  "app_settings",
  "category_settings",
  "task_bulk_imports",
  "task_bulk_import_items",
  "mcp_tokens",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

// "complete" is a task-only lane carrying just {id, completedAt, updatedAt}. It is
// coalesced and pushed separately from ordinary row upserts so that an unrelated
// edit's stale full-row snapshot can never revert a completion (and vice versa).
export type SyncOp = "insert" | "update" | "delete" | "complete";
