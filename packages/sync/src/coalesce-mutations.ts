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
 * `delete` carries no payload. `mutationIds` are every contributing outbox row,
 * all marked synced once this unit is pushed.
 */
export type CoalescedMutation = {
  table: SyncTable;
  op: "upsert" | "delete";
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
 */
export function coalesceMutations(pending: PendingMutation[]): CoalescedMutation[] {
  const byRow = new Map<string, CoalescedMutation>();

  for (const m of pending) {
    const key = `${m.tableName}:${m.rowId}`;
    const prior = byRow.get(key);
    const mutationIds = prior ? [...prior.mutationIds, m.id] : [m.id];

    byRow.set(key, {
      table: m.tableName as SyncTable,
      rowId: m.rowId,
      op: m.op === "delete" ? "delete" : "upsert",
      payload: m.op === "delete" ? null : (JSON.parse(m.payloadJson) as Record<string, unknown>),
      mutationIds,
    });
  }

  return Array.from(byRow.values());
}
