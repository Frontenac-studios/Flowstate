import { describe, expect, it } from "vitest";

import { isSameMutationKey } from "./useSyncStatus";

describe("isSameMutationKey", () => {
  // Regression: the guard used to be
  //   JSON.stringify(mutationKey).includes("sync.run")
  // but tRPC builds keys as nested arrays, so sync.run's key stringifies to
  // '[["sync","run"]]' and never contains "sync.run". The guard silently never
  // fired, so every sync.run success re-armed the debounce and the hook synced
  // in a tight loop forever.
  const syncRunKey = [["sync", "run"]];

  it("does not match on a dotted-path substring", () => {
    expect(JSON.stringify(syncRunKey)).not.toContain("sync.run");
  });

  it("matches the sync.run key", () => {
    expect(isSameMutationKey([["sync", "run"]], syncRunKey)).toBe(true);
  });

  it("does not match other mutations", () => {
    expect(isSameMutationKey([["tasks", "create"]], syncRunKey)).toBe(false);
    expect(isSameMutationKey([["sync", "status"]], syncRunKey)).toBe(false);
    // Prefix-shaped key from a different router path.
    expect(isSameMutationKey([["sync"], ["run"]], syncRunKey)).toBe(false);
  });

  it("does not match when the key is missing", () => {
    expect(isSameMutationKey(undefined, syncRunKey)).toBe(false);
  });
});
