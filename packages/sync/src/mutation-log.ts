import { syncMutations } from "@kash/db-local/schema";
import type { SqliteDb } from "@kash/db-local";
import { asc, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { SyncOp, SyncTable } from "./tables";

export async function recordSyncMutation(
  db: SqliteDb,
  params: {
    table: SyncTable;
    rowId: string;
    op: SyncOp;
    payload: unknown;
  }
): Promise<void> {
  await db.insert(syncMutations).values({
    id: randomUUID(),
    tableName: params.table,
    rowId: params.rowId,
    op: params.op,
    payloadJson: JSON.stringify(params.payload),
    createdAt: new Date(),
    syncedAt: null,
  });
}

export async function listPendingMutations(db: SqliteDb) {
  return db
    .select()
    .from(syncMutations)
    .where(isNull(syncMutations.syncedAt))
    .orderBy(asc(syncMutations.createdAt));
}

export async function markMutationSynced(db: SqliteDb, mutationId: string): Promise<void> {
  await db
    .update(syncMutations)
    .set({ syncedAt: new Date() })
    .where(eq(syncMutations.id, mutationId));
}

/** Batched form of {@link markMutationSynced} — marks every contributing outbox row in one statement. */
export async function markMutationsSynced(db: SqliteDb, mutationIds: string[]): Promise<void> {
  if (mutationIds.length === 0) return;
  await db
    .update(syncMutations)
    .set({ syncedAt: new Date() })
    .where(inArray(syncMutations.id, mutationIds));
}
