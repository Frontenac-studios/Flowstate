import { syncMutations } from "@kash/db-local/schema";
import type { SqliteDb } from "@kash/db-local";
import { eq, isNull } from "drizzle-orm";
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
  return db.select().from(syncMutations).where(isNull(syncMutations.syncedAt));
}

export async function markMutationSynced(db: SqliteDb, mutationId: string): Promise<void> {
  await db
    .update(syncMutations)
    .set({ syncedAt: new Date() })
    .where(eq(syncMutations.id, mutationId));
}
