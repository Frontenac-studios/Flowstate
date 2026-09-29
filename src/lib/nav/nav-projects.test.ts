import { describe, expect, it } from "vitest";

import { navProjects } from "./nav-projects";

const row = (
  over: Partial<Parameters<typeof navProjects>[0][number]>
): Parameters<typeof navProjects>[0][number] => ({
  id: "x",
  name: "X",
  category: "business",
  hue: 1,
  state: "active",
  taskCount: 0,
  completedCount: 0,
  ...over,
});

describe("navProjects", () => {
  it("orders business by hue, then personal, and counts open tasks", () => {
    const out = navProjects([
      row({ id: "p", name: "Personal", category: "personal", hue: null, taskCount: 3 }),
      row({ id: "h", name: "Hume", hue: 2, taskCount: 10, completedCount: 1 }),
      row({ id: "g", name: "Great White", hue: 1, taskCount: 14 }),
    ]);
    expect(out.map((p) => [p.id, p.openCount])).toEqual([
      ["g", 14],
      ["h", 9],
      ["p", 3],
    ]);
  });

  it("drops done projects", () => {
    expect(navProjects([row({ state: "done" }), row({ id: "a", state: "paused" })])).toHaveLength(
      1
    );
  });
});
