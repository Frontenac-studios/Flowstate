import { describe, expect, it } from "vitest";

import { computeSweep, SWEEP_CAP, type SweepCandidate } from "./sweep";

const NOW = new Date("2026-09-01T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function candidate(over: Partial<SweepCandidate> & Pick<SweepCandidate, "id">): SweepCandidate {
  return {
    altitude: "task",
    title: `item ${over.id}`,
    lastActivityAt: daysAgo(30),
    keptUntil: null,
    ...over,
  };
}

describe("computeSweep", () => {
  it("surfaces only items past the 21-day threshold", () => {
    const draft = computeSweep({
      now: NOW,
      candidates: [
        candidate({ id: "fresh", lastActivityAt: daysAgo(20) }),
        candidate({ id: "edge", lastActivityAt: daysAgo(21) }),
        candidate({ id: "stale", lastActivityAt: daysAgo(60) }),
      ],
    });
    expect(draft.items.map((i) => i.id)).toEqual(["stale", "edge"]);
    expect(draft.totalStale).toBe(2);
  });

  it("excludes a still-kept item, and resurfaces it once the keep expires", () => {
    const kept = computeSweep({
      now: NOW,
      candidates: [candidate({ id: "kept", lastActivityAt: daysAgo(90), keptUntil: daysAgo(-5) })],
    });
    expect(kept.totalStale).toBe(0);

    const expired = computeSweep({
      now: NOW,
      candidates: [
        candidate({ id: "kept", lastActivityAt: daysAgo(90), keptUntil: daysAgo(1) }),
      ],
    });
    expect(expired.items.map((i) => i.id)).toEqual(["kept"]);
  });

  it("sorts stalest-first and computes whole stale-days", () => {
    const draft = computeSweep({
      now: NOW,
      candidates: [
        candidate({ id: "a", lastActivityAt: daysAgo(25) }),
        candidate({ id: "b", lastActivityAt: daysAgo(80) }),
        candidate({ id: "c", lastActivityAt: daysAgo(40) }),
      ],
    });
    expect(draft.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(draft.items.map((i) => i.staleDays)).toEqual([80, 40, 25]);
  });

  it("caps at 20 stalest and reports the remainder", () => {
    const candidates = Array.from({ length: 26 }, (_, i) =>
      candidate({ id: `t${String(i).padStart(2, "0")}`, lastActivityAt: daysAgo(22 + i) })
    );
    const draft = computeSweep({ now: NOW, candidates });
    expect(draft.items).toHaveLength(SWEEP_CAP);
    expect(draft.totalStale).toBe(26);
    expect(draft.remaining).toBe(6);
    // Stalest (largest daysAgo) come first.
    expect(draft.items[0]!.id).toBe("t25");
  });

  it("counts each altitude and mixes them in one stalest-first list", () => {
    const draft = computeSweep({
      now: NOW,
      candidates: [
        candidate({ id: "task-old", altitude: "task", lastActivityAt: daysAgo(50) }),
        candidate({ id: "proj-oldest", altitude: "project", lastActivityAt: daysAgo(70) }),
        candidate({ id: "tgt", altitude: "target", lastActivityAt: daysAgo(30) }),
        candidate({ id: "task-fresh", altitude: "task", lastActivityAt: daysAgo(10) }),
      ],
    });
    expect(draft.items.map((i) => i.id)).toEqual(["proj-oldest", "task-old", "tgt"]);
    expect(draft.countsByAltitude).toEqual({ task: 1, project: 1, target: 1 });
    expect(draft.totalStale).toBe(3);
    expect(draft.remaining).toBe(0);
  });

  it("returns an empty draft when nothing is stale", () => {
    const draft = computeSweep({
      now: NOW,
      candidates: [candidate({ id: "x", lastActivityAt: daysAgo(3) })],
    });
    expect(draft.items).toEqual([]);
    expect(draft.totalStale).toBe(0);
    expect(draft.remaining).toBe(0);
    expect(draft.countsByAltitude).toEqual({ task: 0, project: 0, target: 0 });
  });
});
