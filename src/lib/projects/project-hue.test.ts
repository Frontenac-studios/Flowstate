import { describe, expect, it } from "vitest";

import {
  pickNextHue,
  projectFillVar,
  projectSolidVar,
  projectTextVar,
  taskSolidVar,
} from "./project-hue";

describe("pickNextHue", () => {
  it("hands hues out in order", () => {
    expect(pickNextHue([])).toBe(1);
    expect(pickNextHue([1])).toBe(2);
    expect(pickNextHue([1, 2, 3])).toBe(4);
  });

  it("fills the lowest gap before repeating", () => {
    expect(pickNextHue([1, 3, 4])).toBe(2);
    expect(pickNextHue([1, 2, 3, 4, 5, 6, 7, 8])).toBe(1);
    expect(pickNextHue([1, 2, 3, 4, 5, 6, 7, 8, 1])).toBe(2);
  });

  it("ignores null and out-of-range values", () => {
    expect(pickNextHue([null, 0, 9, 1])).toBe(2);
  });
});

describe("project colour vars", () => {
  it("uses the project hue for a business project", () => {
    const p = { category: "business" as const, hue: 3 };
    expect(projectSolidVar(p)).toBe("var(--project-3-solid)");
    expect(projectFillVar(p)).toBe("var(--project-3-fill)");
    expect(projectTextVar(p)).toBe("var(--project-3-text)");
  });

  it("keeps personal projects purple even if a hue slipped in", () => {
    expect(projectSolidVar({ category: "personal", hue: 3 })).toBe("var(--cat-personal-solid)");
  });

  it("falls back to the category colour when a business project has no hue", () => {
    expect(projectSolidVar({ category: "business", hue: null })).toBe("var(--cat-business-solid)");
  });
});

describe("taskSolidVar", () => {
  it("uses the project hue, falling back to the category", () => {
    expect(taskSolidVar({ category: "business", projectHue: 5 })).toBe("var(--project-5-solid)");
    expect(taskSolidVar({ category: "business", projectHue: null })).toBe(
      "var(--cat-business-solid)"
    );
    expect(taskSolidVar({ category: "personal" })).toBe("var(--cat-personal-solid)");
  });
});
