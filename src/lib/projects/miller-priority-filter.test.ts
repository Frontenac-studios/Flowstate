import { describe, expect, it } from "vitest";

import { filterTasksByPriority } from "./miller-priority-filter";

const tasks = [
  { id: "a", priority: 3 },
  { id: "b", priority: 2 },
  { id: "c", priority: 0 },
  { id: "d", priority: 1 },
];

describe("filterTasksByPriority", () => {
  it("returns all tasks when no level is selected", () => {
    expect(filterTasksByPriority(tasks, new Set())).toHaveLength(4);
  });

  it("keeps only tasks matching the selected levels", () => {
    expect(filterTasksByPriority(tasks, new Set([3])).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasksByPriority(tasks, new Set([3, 1])).map((t) => t.id)).toEqual(["a", "d"]);
  });

  it("can filter to the None level", () => {
    expect(filterTasksByPriority(tasks, new Set([0])).map((t) => t.id)).toEqual(["c"]);
  });

  it("clamps unknown priority integers to None before matching", () => {
    const odd = [{ id: "x", priority: 9 }];
    expect(filterTasksByPriority(odd, new Set([0]))).toHaveLength(1);
    expect(filterTasksByPriority(odd, new Set([3]))).toHaveLength(0);
  });
});
