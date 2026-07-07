import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * A single query-cache entry captured before an optimistic write, kept so
 * `onError` can restore it. `prev` is `unknown` because a mutation may snapshot
 * several differently-typed lists in one go; the value is only ever written back
 * to the same key it came from.
 */
export type CacheSnapshot = { key: QueryKey; prev: unknown };

/**
 * Cancel any in-flight fetch for `key`, snapshot the current cache entry, then
 * apply `updater` to it. Returns the snapshot for rollback. When the cache is
 * empty (no query has run yet) the patch is skipped — there is nothing to
 * reconcile until the next fetch, which `onSettled` invalidation triggers.
 *
 * Cache data is already superjson-deserialized on read, so `updater` operates on
 * plain objects.
 */
export async function optimisticPatch<T>(
  queryClient: QueryClient,
  key: QueryKey,
  updater: (old: T) => T
): Promise<CacheSnapshot> {
  await queryClient.cancelQueries({ queryKey: key });
  const prev = queryClient.getQueryData<T>(key);
  if (prev !== undefined) {
    queryClient.setQueryData<T>(key, updater(prev));
  }
  return { key, prev };
}

/** Restore every snapshot captured by `optimisticPatch` (used in `onError`). */
export function rollbackPatches(
  queryClient: QueryClient,
  snapshots: readonly CacheSnapshot[] | undefined
): void {
  if (!snapshots) return;
  for (const snap of snapshots) {
    queryClient.setQueryData(snap.key, snap.prev);
  }
}
