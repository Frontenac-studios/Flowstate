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

export async function syncAbyssItemRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "abyss_items", rowId, op, payload });
}

export async function syncProjectRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "projects", rowId, op, payload });
}

export async function syncPhaseRow(rowId: string, op: SyncOp, payload: unknown): Promise<void> {
  await recordSyncMutation({ table: "phases", rowId, op, payload });
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

type PlanningSyncTable =
  | "bingo_cards"
  | "goals"
  | "goal_milestones"
  | "quarter_themes"
  | "month_intentions"
  | "reserved_days"
  | "planning_suggestions";

export async function syncPlanningRow(
  table: PlanningSyncTable,
  rowId: string,
  op: SyncOp,
  payload: unknown
): Promise<void> {
  await recordSyncMutation({ table, rowId, op, payload });
}
