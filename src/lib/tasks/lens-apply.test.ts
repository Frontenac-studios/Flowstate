import { describe, expect, it } from "vitest";

import type { PlanTaskRow } from "@/components/kash/plan/TaskRow";

import {
  applyLens,
  filterTasks,
  filterTasksByTags,
  groupTasks,
  LENS_NONE,
  sortWithinGroup,
  taskLensValue,
} from "./lens-apply";
import { EMPTY_LENS, type LensState } from "./lens";

const TODAY = new Date("2026-06-22T12:00:00");

function task(over: Partial<PlanTaskRow> & { id: string }): PlanTaskRow {
  return {
    title: over.id,
    priority: 0,
    projectId: null,
    projectSlug: null,
    projectName: null,
    isTop3: false,
    ...over,
  };
}

describe("taskLensValue", () => {
  it("resolves category, falling back to none when unresolved/absent", () => {
    expect(taskLensValue(task({ id: "a", category: "professional" }), "category")).toBe(
      "professional"
    );
    expect(
      taskLensValue(task({ id: "b", category: "adulting", categoryUnresolved: true }), "category")
    ).toBe(LENS_NONE);
    expect(taskLensValue(task({ id: "c" }), "category")).toBe(LENS_NONE);
  });

  it("maps priority to its level key", () => {
    expect(taskLensValue(task({ id: "a", priority: 3 }), "priority")).toBe("3");
    expect(taskLensValue(task({ id: "b", priority: 0 }), "priority")).toBe("0");
  });

  it("buckets due dates relative to today", () => {
    expect(taskLensValue(task({ id: "a", scheduledDate: "2026-06-20" }), "due", TODAY)).toBe(
      "overdue"
    );
    expect(taskLensValue(task({ id: "b", scheduledDate: "2026-06-22" }), "due", TODAY)).toBe(
      "today"
    );
    expect(taskLensValue(task({ id: "c", scheduledDate: "2026-06-23" }), "due", TODAY)).toBe(
      "tomorrow"
    );
    expect(taskLensValue(task({ id: "d", scheduledDate: "2026-06-26" }), "due", TODAY)).toBe(
      "this_week"
    );
    expect(taskLensValue(task({ id: "e", scheduledDate: "2026-07-10" }), "due", TODAY)).toBe(
      "later"
    );
    expect(taskLensValue(task({ id: "f" }), "due", TODAY)).toBe(LENS_NONE);
  });
});

describe("filterTasks", () => {
  const tasks = [
    task({ id: "a", category: "professional" }),
    task({ id: "b", category: "relationships" }),
    task({ id: "c" }), // no category → none
  ];

  it("returns all tasks when no filter is set", () => {
    expect(filterTasks(tasks, EMPTY_LENS)).toHaveLength(3);
  });

  it("ORs within a lens's selected values", () => {
    const state: LensState = {
      active: ["category"],
      group: null,
      filters: { category: ["professional", "relationships"] },
    };
    expect(filterTasks(tasks, state).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("can filter the none bucket", () => {
    const state: LensState = {
      active: ["category"],
      group: null,
      filters: { category: [LENS_NONE] },
    };
    expect(filterTasks(tasks, state).map((t) => t.id)).toEqual(["c"]);
  });

  it("ANDs across two lenses", () => {
    const two = [
      task({ id: "a", category: "professional", priority: 3 }),
      task({ id: "b", category: "professional", priority: 1 }),
    ];
    const state: LensState = {
      active: ["category", "priority"],
      group: null,
      filters: { category: ["professional"], priority: ["3"] },
    };
    expect(filterTasks(two, state).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("sortWithinGroup", () => {
  it("sorts by priority desc then title", () => {
    const tasks = [
      task({ id: "1", title: "zebra", priority: 1 }),
      task({ id: "2", title: "apple", priority: 3 }),
      task({ id: "3", title: "mango", priority: 1 }),
    ];
    expect(sortWithinGroup(tasks).map((t) => t.title)).toEqual(["apple", "mango", "zebra"]);
  });

  it("does not mutate the input", () => {
    const tasks = [task({ id: "1", priority: 1 }), task({ id: "2", priority: 3 })];
    sortWithinGroup(tasks);
    expect(tasks.map((t) => t.id)).toEqual(["1", "2"]);
  });
});

describe("groupTasks", () => {
  it("emits non-empty groups in canonical category order, none last", () => {
    const tasks = [
      task({ id: "a", category: "adulting" }),
      task({ id: "b", category: "professional" }),
      task({ id: "c" }), // none
    ];
    const groups = groupTasks(tasks, "category");
    expect(groups.map((g) => g.key)).toEqual(["professional", "adulting", LENS_NONE]);
    expect(groups[0]!.label).toBe("Professional");
    expect(groups.at(-1)!.label).toBe("No category");
  });

  it("orders priority groups high → none and sorts within", () => {
    const tasks = [
      task({ id: "a", title: "b", priority: 1 }),
      task({ id: "b", title: "a", priority: 1 }),
      task({ id: "c", priority: 3 }),
    ];
    const groups = groupTasks(tasks, "priority");
    expect(groups.map((g) => g.key)).toEqual(["3", "1"]);
    expect(groups[1]!.tasks.map((t) => t.title)).toEqual(["a", "b"]);
  });
});

describe("applyLens", () => {
  const tasks = [
    task({ id: "a", category: "professional", priority: 3 }),
    task({ id: "b", category: "professional", priority: 1 }),
    task({ id: "c", category: "relationships", priority: 2 }),
  ];

  it("returns a flat filtered list when no group lens is set", () => {
    const state: LensState = {
      active: ["category"],
      group: null,
      filters: { category: ["professional"] },
    };
    const result = applyLens(tasks, state);
    expect(result.kind).toBe("flat");
    if (result.kind === "flat") expect(result.tasks.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("groups (filtered) when a group lens is set", () => {
    const state: LensState = {
      active: ["category", "priority"],
      group: "priority",
      filters: { category: ["professional"] },
    };
    const result = applyLens(tasks, state);
    expect(result.kind).toBe("grouped");
    if (result.kind === "grouped") {
      // only professional tasks remain, grouped by priority 3 then 1
      expect(result.groups.map((g) => g.key)).toEqual(["3", "1"]);
    }
  });

  it("filters by selected tags with OR semantics", () => {
    const tagged = [
      task({ id: "a", tags: ["work"] }),
      task({ id: "b", tags: ["home"] }),
      task({ id: "c", tags: ["work", "urgent"] }),
    ];
    expect(
      filterTasksByTags(tagged, ["work"])
        .map((t) => t.id)
        .sort()
    ).toEqual(["a", "c"]);
  });
});
