export { pickNewerRow } from "./conflict";
export { coalesceMutations } from "./coalesce-mutations";
export type { CoalescedMutation, PendingMutation } from "./coalesce-mutations";
export {
  listPendingMutations,
  markMutationSynced,
  markMutationsSynced,
  recordSyncMutation,
} from "./mutation-log";
export { runSync } from "./sync-engine";
export { SYNC_TABLES, type SyncOp, type SyncTable } from "./tables";
