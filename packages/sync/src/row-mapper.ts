import type { SyncTable } from "./tables";

/** Map Postgres snake_case rows from Supabase to SQLite column shapes. */
export function mapRemoteRow(
  table: SyncTable,
  row: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...row };

  if (table === "day_reviews" && "date" in base) {
    base.reviewDate = base.date;
    delete base.date;
  }

  if (table === "chat_messages" && base.content && typeof base.content === "object") {
    base.content = JSON.stringify(base.content);
  }

  if (table === "nudge_events" && base.task_ids != null) {
    base.taskIds =
      typeof base.task_ids === "string" ? base.task_ids : JSON.stringify(base.task_ids);
    delete base.task_ids;
  }

  if (table === "task_occurrence_overrides" && base.patch != null) {
    base.patch = typeof base.patch === "string" ? base.patch : JSON.stringify(base.patch);
  }

  if (table === "quarter_themes" && base.focus_categories != null) {
    base.focusCategories =
      typeof base.focus_categories === "string"
        ? base.focus_categories
        : JSON.stringify(base.focus_categories);
    delete base.focus_categories;
  }

  if (table === "planning_suggestions" && base.payload != null) {
    base.payload = typeof base.payload === "string" ? base.payload : JSON.stringify(base.payload);
  }

  const dateFields = [
    "created_at",
    "updated_at",
    "completed_at",
    "top_3_pinned_at",
    "started_at",
    "ended_at",
    "synced_at",
    "pulled_at",
    "undone_at",
    "finalized_at",
    "occurred_at",
    "archived_at",
  ];

  for (const key of dateFields) {
    if (key in base && base[key] != null) {
      const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      if (camel !== key) {
        base[camel] = new Date(base[key] as string);
        delete base[key];
      } else if (typeof base[key] === "string") {
        base[key] = new Date(base[key] as string);
      }
    }
  }

  // Normalize user_id → userId etc.
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(base)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    mapped[camel] = v;
  }

  if (table === "tasks" && "isTop3" in mapped && typeof mapped.isTop3 === "boolean") {
    mapped.isTop3 = mapped.isTop3 ? 1 : 0;
  }

  if (
    table === "tasks" &&
    "categoryUnresolved" in mapped &&
    typeof mapped.categoryUnresolved === "boolean"
  ) {
    mapped.categoryUnresolved = mapped.categoryUnresolved ? 1 : 0;
  }

  return mapped;
}

const CAMEL_TO_SNAKE: Record<string, string> = {
  isTop3: "is_top_3",
  top3Order: "top_3_order",
  top3PinnedAt: "top_3_pinned_at",
  userId: "user_id",
  projectId: "project_id",
  parentPhaseId: "parent_phase_id",
  startDate: "start_date",
  endDate: "end_date",
  sortOrder: "sort_order",
  scheduledDate: "scheduled_date",
  bucketOverride: "bucket_override",
  completedAt: "completed_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
  taskId: "task_id",
  recurrenceId: "recurrence_id",
  occurrenceDate: "occurrence_date",
  movedToDate: "moved_to_date",
  templateId: "template_id",
  isoWeekday: "iso_weekday",
  startMin: "start_min",
  endMin: "end_min",
  milestoneId: "milestone_id",
  timeEstimateMinutes: "time_estimate_minutes",
  bingoCardId: "bingo_card_id",
  obligationDesire: "obligation_desire",
  valueId: "value_id",
  targetHorizon: "target_horizon",
  targetYear: "target_year",
  targetQuarter: "target_quarter",
  targetMonth: "target_month",
  cellIndex: "cell_index",
  goalId: "goal_id",
  cardYear: "card_year",
  finalizedAt: "finalized_at",
  focusCategories: "focus_categories",
  resolvedDate: "resolved_date",
  threadId: "thread_id",
  reviewDate: "date",
  reflectionText: "reflection_text",
  reflectiveQuestion: "reflective_question",
  top3Status: "top_3_status",
  bucketMode: "bucket_mode",
  localDate: "local_date",
  taskIds: "task_ids",
  startedAt: "started_at",
  endedAt: "ended_at",
  taskCount: "task_count",
  undoneAt: "undone_at",
  importId: "import_id",
};

export function mapPayloadToRemote(
  table: SyncTable,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(payload)) {
    const snake = CAMEL_TO_SNAKE[k] ?? k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    out[snake] = v;
  }

  if (table === "day_reviews" && out.review_date) {
    out.date = out.review_date;
    delete out.review_date;
  }

  if (table === "chat_messages" && typeof out.content === "string") {
    try {
      out.content = JSON.parse(out.content as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "nudge_events" && typeof out.task_ids === "string") {
    out.task_ids = JSON.parse(out.task_ids as string);
  }

  if (table === "task_occurrence_overrides" && typeof out.patch === "string") {
    try {
      out.patch = JSON.parse(out.patch as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "tasks" && typeof out.is_top_3 === "number") {
    out.is_top_3 = out.is_top_3 === 1;
  }

  if (table === "tasks" && typeof out.category_unresolved === "number") {
    out.category_unresolved = out.category_unresolved === 1;
  }

  if (table === "task_occurrence_overrides" && typeof out.patch === "object" && out.patch) {
    out.patch = JSON.stringify(out.patch);
  }

  if (table === "quarter_themes" && typeof out.focus_categories === "string") {
    try {
      out.focus_categories = JSON.parse(out.focus_categories as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "planning_suggestions" && typeof out.payload === "string") {
    try {
      out.payload = JSON.parse(out.payload as string);
    } catch {
      /* keep string */
    }
  }

  if (
    table === "quarter_themes" &&
    typeof out.focus_categories === "object" &&
    out.focus_categories
  ) {
    out.focus_categories = JSON.stringify(out.focus_categories);
  }

  if (table === "planning_suggestions" && typeof out.payload === "object" && out.payload) {
    out.payload = JSON.stringify(out.payload);
  }

  return out;
}
