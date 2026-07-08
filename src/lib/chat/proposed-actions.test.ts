import { describe, expect, it } from "vitest";

import {
  filterPayloadByEnabledItems,
  filterPayloadByItemIds,
  mergeCreateTaskEdits,
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

  it("parses a create_task proposal carrying a suggested date and null schedule", () => {
    const action = proposedActionSchema.parse({
      kind: "create_task",
      status: "pending",
      items: [
        {
          itemId: "a",
          enabled: true,
          title: "Ship the deck",
          suggestedDate: "2026-07-10",
          scheduledDate: null,
          projectSlug: null,
          priority: 2,
        },
      ],
    });
    expect(action.kind).toBe("create_task");
    if (action.kind === "create_task") {
      expect(action.items[0]?.suggestedDate).toBe("2026-07-10");
      expect(action.items[0]?.scheduledDate).toBeNull();
    }
  });

  it("rejects a malformed suggested date", () => {
    const result = proposedActionSchema.safeParse({
      kind: "create_task",
      status: "pending",
      items: [{ itemId: "a", enabled: true, title: "Bad date", suggestedDate: "07/10/2026" }],
    });
    expect(result.success).toBe(false);
  });

  const createTask = proposedActionSchema.parse({
    kind: "create_task",
    status: "pending",
    items: [
      { itemId: "a", enabled: true, title: "Draft deck", suggestedDate: null, priority: 0 },
      { itemId: "b", enabled: true, title: "Book venue", suggestedDate: "2026-07-10", priority: 1 },
    ],
  });

  it("mergeCreateTaskEdits overlays edited fields and keeps only listed rows", () => {
    const merged = mergeCreateTaskEdits(createTask, [
      { itemId: "a", title: "Draft the deck", suggestedDate: "2026-07-11", priority: 3 },
    ]);
    expect(merged?.kind).toBe("create_task");
    if (merged?.kind === "create_task") {
      expect(merged.items).toHaveLength(1);
      expect(merged.items[0]?.itemId).toBe("a");
      expect(merged.items[0]?.title).toBe("Draft the deck");
      expect(merged.items[0]?.suggestedDate).toBe("2026-07-11");
      expect(merged.items[0]?.priority).toBe(3);
    }
  });

  it("mergeCreateTaskEdits overlays category and phase fields", () => {
    const withPlacement = proposedActionSchema.parse({
      kind: "create_task",
      status: "pending",
      items: [
        {
          itemId: "a",
          enabled: true,
          title: "Order dumpster",
          projectSlug: "reno",
          phaseName: "Demolition",
          category: "professional",
        },
      ],
    });
    const merged = mergeCreateTaskEdits(withPlacement, [
      {
        itemId: "a",
        title: "Order the dumpster",
        category: "adulting",
        phaseId: "00000000-0000-4000-8000-000000000099",
      },
    ]);
    if (merged?.kind === "create_task") {
      expect(merged.items[0]?.title).toBe("Order the dumpster");
      expect(merged.items[0]?.category).toBe("adulting");
      expect(merged.items[0]?.phaseId).toBe("00000000-0000-4000-8000-000000000099");
    }
  });

  it("parses create_task items with richer placement fields", () => {
    const action = proposedActionSchema.parse({
      kind: "create_task",
      status: "pending",
      items: [
        {
          itemId: "a",
          enabled: true,
          title: "Rough-in plumbing",
          projectSlug: "reno",
          phaseId: "00000000-0000-4000-8000-000000000001",
          category: "professional",
          tags: ["plumber"],
          timeEstimateMinutes: 120,
        },
      ],
    });
    if (action.kind === "create_task") {
      expect(action.items[0]?.tags).toEqual(["plumber"]);
      expect(action.items[0]?.timeEstimateMinutes).toBe(120);
    }
  });

  it("mergeCreateTaskEdits returns null when no rows are kept", () => {
    expect(mergeCreateTaskEdits(createTask, [])).toBeNull();
  });

  it("mergeCreateTaskEdits re-validates edited items (rejects bad input)", () => {
    expect(() =>
      mergeCreateTaskEdits(createTask, [{ itemId: "a", title: "", suggestedDate: null }])
    ).toThrow();
  });

  it("parses delete_task proposals", () => {
    const action = proposedActionSchema.parse({
      kind: "delete_task",
      items: [
        {
          itemId: "a",
          enabled: true,
          taskId: "00000000-0000-4000-8000-000000000001",
          title: "Gone",
        },
      ],
    });
    expect(proposalHeadline(action)).toContain("Delete 1 task");
  });
});
