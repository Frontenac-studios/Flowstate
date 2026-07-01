import { describe, expect, it } from "vitest";

import { assignProposalsToEmptySlots } from "./assign-proposals";
import type { WinProposal } from "./types";

const proposal = (refId: string, label: string): WinProposal => ({
  refId,
  label,
  source: "task",
  tier: 1,
  occurredAt: new Date("2026-07-01T12:00:00.000Z"),
});

describe("assignProposalsToEmptySlots", () => {
  it("assigns proposals to empty slots in order", () => {
    const map = assignProposalsToEmptySlots(
      [null, { refId: "a" }, null],
      [proposal("b", "B"), proposal("c", "C"), proposal("d", "D")]
    );

    expect(map.get(0)?.refId).toBe("b");
    expect(map.get(2)?.refId).toBe("c");
    expect(map.has(1)).toBe(false);
  });

  it("skips proposals already accepted in a slot", () => {
    const map = assignProposalsToEmptySlots(
      [null, null, null],
      [proposal("a", "A"), proposal("b", "B")]
    );

    expect(map.get(0)?.refId).toBe("a");
    expect(map.get(1)?.refId).toBe("b");
    expect(map.size).toBe(2);
  });
});
