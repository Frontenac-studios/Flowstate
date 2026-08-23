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

  // `content` is a JSON-mode column in the local schema, so Drizzle serializes
  // the object itself on insert. Passing an already-stringified value here would
  // double-encode it.

  if (table === "task_occurrence_overrides" && base.patch != null) {
    base.patch = typeof base.patch === "string" ? base.patch : JSON.stringify(base.patch);
  }

  if (table === "abyss_items" && base.links != null) {
    base.links = typeof base.links === "string" ? base.links : JSON.stringify(base.links);
  }

  if (table === "abyss_items" && base.embedding != null) {
    base.embedding =
      typeof base.embedding === "string" ? base.embedding : JSON.stringify(base.embedding);
  }

  if (table === "abyss_items" && base.tags != null) {
    base.tags = typeof base.tags === "string" ? base.tags : JSON.stringify(base.tags);
  }

  if (table === "tasks" && base.tags != null) {
    base.tags = typeof base.tags === "string" ? base.tags : JSON.stringify(base.tags);
  }

  if (table === "project_templates" && base.structure != null) {
    base.structure =
      typeof base.structure === "string" ? base.structure : JSON.stringify(base.structure);
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
    "last_resurfaced_at",
    "last_touched_at",
    "occurred_at",
    "archived_at",
    "learned_at",
    "effective_from",
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
  obligationDesire: "obligation_desire",
  targetHorizon: "target_horizon",
  targetYear: "target_year",
  targetQuarter: "target_quarter",
  targetMonth: "target_month",
  goalId: "goal_id",
  resolvedDate: "resolved_date",
  threadId: "thread_id",
  reviewDate: "date",
  refId: "ref_id",
  reflectionText: "reflection_text",
  reflectiveQuestion: "reflective_question",
  top3Status: "top_3_status",
  bucketMode: "bucket_mode",
  localDate: "local_date",
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

  if (table === "tasks" && typeof out.tags === "string") {
    try {
      out.tags = JSON.parse(out.tags as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "task_occurrence_overrides" && typeof out.patch === "object" && out.patch) {
    out.patch = JSON.stringify(out.patch);
  }

  if (table === "abyss_items" && typeof out.links === "string") {
    try {
      out.links = JSON.parse(out.links as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "abyss_items" && typeof out.embedding === "string") {
    try {
      out.embedding = JSON.parse(out.embedding as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "abyss_items" && typeof out.tags === "string") {
    try {
      out.tags = JSON.parse(out.tags as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "abyss_items" && typeof out.links === "object" && out.links) {
    out.links = JSON.stringify(out.links);
  }

  if (table === "abyss_items" && typeof out.embedding === "object" && out.embedding) {
    out.embedding = JSON.stringify(out.embedding);
  }

  if (table === "abyss_items" && typeof out.tags === "object" && out.tags) {
    out.tags = JSON.stringify(out.tags);
  }

  if (table === "tasks" && typeof out.tags === "object" && out.tags) {
    out.tags = JSON.stringify(out.tags);
  }

  if (table === "project_templates" && typeof out.structure === "string") {
    try {
      out.structure = JSON.parse(out.structure as string);
    } catch {
      /* keep string */
    }
  }

  if (table === "project_templates" && typeof out.structure === "object" && out.structure) {
    out.structure = JSON.stringify(out.structure);
  }

  return out;
}
