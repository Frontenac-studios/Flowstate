import { describe, expect, it } from "vitest";

import {
  filterPayloadByEnabledItems,
  filterPayloadByItemIds,
  proposalHeadline,
  proposedActionSchema,
} from "./proposed-actions";

describe("proposed-actions", () => {
  const reschedule = proposedActionSchema.parse({
    kind: "reschedule_tasks",
    status: "pending",
    items: [
      {
        itemId: "a",
        enabled: true,
        taskId: "00000000-0000-4000-8000-000000000001",
        title: "Alpha",
        scheduledDate: "2026-07-03",
      },
      {
        itemId: "b",
        enabled: false,
        taskId: "00000000-0000-4000-8000-000000000002",
        title: "Beta",
        scheduledDate: "2026-07-04",
      },
    ],
  });

  it("parses reschedule_tasks proposals", () => {
    expect(reschedule.kind).toBe("reschedule_tasks");
    expect(reschedule.items).toHaveLength(2);
  });

  it("filterPayloadByEnabledItems keeps only enabled rows", () => {
    const filtered = filterPayloadByEnabledItems(reschedule);
    expect(filtered?.kind).toBe("reschedule_tasks");
    if (filtered?.kind === "reschedule_tasks") {
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0]?.title).toBe("Alpha");
    }
  });

  it("filterPayloadByItemIds respects explicit selection", () => {
    const filtered = filterPayloadByItemIds(reschedule, ["b"]);
    expect(filtered?.kind).toBe("reschedule_tasks");
    if (filtered?.kind === "reschedule_tasks") {
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0]?.title).toBe("Beta");
    }
  });

  it("builds a headline for multi-task reschedule", () => {
    expect(proposalHeadline(reschedule)).toContain("Reschedule 2 tasks");
  });
});
