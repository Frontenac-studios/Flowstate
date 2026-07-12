import { describe, expect, it } from "vitest";

import {
  collectStagedDependencyEdges,
  isStagedCaptureId,
  stagedCapturesFromEdits,
  type StagedCapture,
} from "./staged-capture";

describe("staged-capture", () => {
  it("builds staged rows from create_task edits", () => {
    const rows = stagedCapturesFromEdits([
      {
        itemId: "a",
        title: " Email lease ",
        category: "adulting",
        projectSlug: null,
        priority: 1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(isStagedCaptureId(rows[0]!.id)).toBe(true);
    expect(rows[0]!.title).toBe("Email lease");
    expect(rows[0]!.sourceItemId).toBe("a");
    expect(rows[0]!.category).toBe("adulting");
  });

  it("collects Dep-B edges only within the staged set", () => {
    const staged: StagedCapture[] = [
      {
        id: "staged:1",
        sourceItemId: "a",
        title: "A",
        category: null,
        projectSlug: null,
        phaseId: null,
        priority: 0,
        suggestedDate: null,
        blocksItemIds: ["b", "missing"],
      },
      {
        id: "staged:2",
        sourceItemId: "b",
        title: "B",
        category: null,
        projectSlug: null,
        phaseId: null,
        priority: 0,
        suggestedDate: null,
        blocksItemIds: [],
      },
    ];
    expect(collectStagedDependencyEdges(staged)).toEqual([
      { blockerItemId: "a", blockedItemId: "b" },
    ]);
  });
});
