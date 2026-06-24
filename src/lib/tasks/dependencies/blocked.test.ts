import { describe, expect, it } from "vitest";

import { computeDependencyState, isActiveEdge } from "./blocked";
import type { DependencyEdge } from "./types";

const NOW = new Date("2026-06-24T12:00:00Z");
const past = new Date("2026-06-22T00:00:00Z");
const future = new Date("2026-06-29T00:00:00Z");

const edge = (
  blockerTaskId: string,
  blockedTaskId: string,
  expiresAt: Date | null = null
): DependencyEdge => ({ blockerTaskId, blockedTaskId, expiresAt });

describe("isActiveEdge", () => {
  it("treats project edges (null expiry) as always active", () => {
    expect(isActiveEdge({ expiresAt: null }, NOW)).toBe(true);
  });
  it("treats a future-expiry window edge as active and a past one as expired", () => {
    expect(isActiveEdge({ expiresAt: future }, NOW)).toBe(true);
    expect(isActiveEdge({ expiresAt: past }, NOW)).toBe(false);
  });
});

describe("computeDependencyState", () => {
  it("marks a task blocked by an incomplete blocker", () => {
    const state = computeDependencyState([edge("a", "b")], ["a", "b"], NOW);
    expect(state.get("b")).toEqual({ isBlocked: true, blockedByIds: ["a"], unblocksCount: 0 });
    expect(state.get("a")).toEqual({ isBlocked: false, blockedByIds: [], unblocksCount: 1 });
  });

  it("does not block when the blocker is completed (absent from incomplete set)", () => {
    const state = computeDependencyState([edge("a", "b")], ["b"], NOW);
    expect(state.get("b")?.isBlocked).toBe(false);
  });

  it("ignores expired window edges", () => {
    const state = computeDependencyState([edge("a", "b", past)], ["a", "b"], NOW);
    expect(state.get("b")?.isBlocked).toBe(false);
    expect(state.get("a")?.unblocksCount).toBe(0);
  });

  it("counts active window edges", () => {
    const state = computeDependencyState([edge("a", "b", future)], ["a", "b"], NOW);
    expect(state.get("b")?.isBlocked).toBe(true);
    expect(state.get("a")?.unblocksCount).toBe(1);
  });

  it("counts multiple dependents toward unblocksCount", () => {
    const state = computeDependencyState([edge("a", "b"), edge("a", "c")], ["a", "b", "c"], NOW);
    expect(state.get("a")?.unblocksCount).toBe(2);
  });

  it("records multiple blockers for one task", () => {
    const state = computeDependencyState([edge("a", "c"), edge("b", "c")], ["a", "b", "c"], NOW);
    expect(state.get("c")?.isBlocked).toBe(true);
    expect(state.get("c")?.blockedByIds.sort()).toEqual(["a", "b"]);
  });

  it("does not annotate a task that isn't in the incomplete set", () => {
    const state = computeDependencyState([edge("a", "b")], ["a"], NOW);
    expect(state.has("b")).toBe(false);
  });
});
