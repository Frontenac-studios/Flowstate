import type { SyncTable } from "./tables";

/** A pending row from the local `sync_mutations` outbox (subset used for coalescing). */
export type PendingMutation = {
  id: string;
  tableName: string;
  rowId: string;
  op: string;
  payloadJson: string;
  createdAt: Date;
};

/**
 * One coalesced unit of work per (table, rowId). `upsert` carries the full-row
 * payload (insert/update are equivalent — the outbox stores the whole record);
 * `delete` carries no payload; `complete` carries only `{id, completedAt, updatedAt}`
 * and is applied as a targeted completion write. `mutationIds` are every
 * contributing outbox row, all marked synced once this unit is pushed.
 */
export type CoalescedMutation = {
  table: SyncTable;
  op: "upsert" | "delete" | "complete";
  rowId: string;
  payload: Record<string, unknown> | null;
  mutationIds: string[];
};

/**
 * Collapse the pending outbox to the last write per row. Expects `pending` in
 * `createdAt` ascending order (see `listPendingMutations`); a later mutation for
 * the same (table, rowId) supersedes earlier ones, and a final `delete` wins over
 * any prior upserts. All superseded mutation ids are retained so they can be
 * marked synced together.
 *
 * The `complete` lane is coalesced on a SEPARATE key from ordinary row writes, so a
 * task's completion state and its other-field edits never collapse into (and clobber)
 * one another — that separation is what stops an unrelated edit from resurrecting a
 * completed task.
 */
export function coalesceMutations(pending: PendingMutation[]): CoalescedMutation[] {
  const byRow = new Map<string, CoalescedMutation>();

  for (const m of pending) {
    const isComplete = m.op === "complete";
    const key = isComplete ? `complete:${m.tableName}:${m.rowId}` : `${m.tableName}:${m.rowId}`;
    const prior = byRow.get(key);
    const mutationIds = prior ? [...prior.mutationIds, m.id] : [m.id];

    const op: CoalescedMutation["op"] = isComplete
      ? "complete"
      : m.op === "delete"
        ? "delete"
        : "upsert";

    byRow.set(key, {
      table: m.tableName as SyncTable,
      rowId: m.rowId,
      op,
      payload: op === "delete" ? null : (JSON.parse(m.payloadJson) as Record<string, unknown>),
      mutationIds,
    });
  }

  return Array.from(byRow.values());
}
