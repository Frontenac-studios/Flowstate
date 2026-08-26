import type { SqliteDb } from "@kash/db-local";
import { recordSyncMutation as record } from "@kash/sync";
import type { SyncOp, SyncTable } from "@kash/sync";

import { db } from "./index";
import { isSqliteMode } from "./mode";

export async function recordSyncMutation(params: {
  table: SyncTable;
  rowId: string;
  op: SyncOp;
  payload: unknown;
}): Promise<void> {
  if (!isSqliteMode()) return;
  await record(db as unknown as SqliteDb, params);
}

export async function syncTaskRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "tasks", rowId, op, payload });
}

/**
 * Record a task completion/uncompletion on its own sync lane. Carries only the
 * completion fields, so the push applies it as a targeted `completed_at` write
 * that neither clobbers nor is clobbered by an unrelated full-row task edit.
 */
export async function syncTaskCompletion(
  rowId: string,
  completedAt: Date | null,
  updatedAt: Date
): Promise<void> {
  await recordSyncMutation({
    table: "tasks",
    rowId,
    op: "complete",
    payload: { id: rowId, completedAt, updatedAt },
  });
}

export async function syncRecurrenceRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "task_recurrence", rowId, op, payload });
}

export async function syncOccurrenceOverrideRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "task_occurrence_overrides", rowId, op, payload });
}

export async function syncProtectedBlockRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "protected_blocks", rowId, op, payload });
}

export async function syncProtectedBlockTemplateRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "protected_block_templates", rowId, op, payload });
}

export async function syncWeekDayPriorityRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "week_day_priorities", rowId, op, payload });
}

export async function syncAbyssItemRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "abyss_items", rowId, op, payload });
}

export async function syncProjectRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "projects", rowId, op, payload });
}

export async function syncClientRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "clients", rowId, op, payload });
}

export async function syncDirectionRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "directions", rowId, op, payload });
}

export async function syncTargetRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "targets", rowId, op, payload });
}

export async function syncRateRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "rates", rowId, op, payload });
}

export async function syncInvoiceRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "invoices", rowId, op, payload });
}

export async function syncInvoiceLineRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "invoice_lines", rowId, op, payload });
}

export async function syncTimeTagRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "time_tags", rowId, op, payload });
}

export async function syncBusinessExpenseRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "business_expenses", rowId, op, payload });
}

export async function syncMoneySettingsRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "money_settings", rowId, op, payload });
}

export async function syncOwnerDrawRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "owner_draws", rowId, op, payload });
}

export async function syncProjectTemplateRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "project_templates", rowId, op, payload });
}

export async function syncPhaseRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "phases", rowId, op, payload });
}

export async function syncProjectMilestoneRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "project_milestones", rowId, op, payload });
}

export async function syncTaskBulkImportRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "task_bulk_imports", rowId, op, payload });
}

export async function syncTaskBulkImportItemRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "task_bulk_import_items", rowId, op, payload });
}

export async function syncCareActivityRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "care_activities", rowId, op, payload });
}

export async function syncCareEventRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "care_events", rowId, op, payload });
}

export async function syncCareReflectionRow(
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table: "care_reflections", rowId, op, payload });
}

type PlanningSyncTable = "goals" | "goal_milestones" | "reserved_days";

export async function syncPlanningRow(
  table: PlanningSyncTable,
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table, rowId, op, payload });
}
