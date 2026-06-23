import { describe, expect, it } from "vitest";

import {
  EMPTY_LENS,
  LENS_CAP,
  hasActiveFilters,
  isLensActive,
  parseLens,
  revealFlagsFromLens,
  serializeLens,
  setGroupLens,
  toggleFilterValue,
  toggleLens,
  type LensState,
} from "./lens";

describe("toggleLens", () => {
  it("turns an inactive lens on", () => {
    expect(toggleLens(EMPTY_LENS, "category")).toEqual({
      active: ["category"],
      group: null,
      filters: {},
    });
  });

  it("turns an active lens off", () => {
    const on: LensState = { active: ["category"], group: null, filters: {} };
    expect(toggleLens(on, "category").active).toEqual([]);
  });

  it("keeps insertion order oldest → newest", () => {
    const a = toggleLens(EMPTY_LENS, "priority");
    const b = toggleLens(a, "due");
    expect(b.active).toEqual(["priority", "due"]);
  });

  it("drops the oldest when a 3rd lens exceeds the cap (VF3)", () => {
    let state = toggleLens(EMPTY_LENS, "category"); // [category]
    state = toggleLens(state, "priority"); // [category, priority]
    state = toggleLens(state, "project"); // cap → [priority, project]
    expect(state.active).toEqual(["priority", "project"]);
    expect(state.active).toHaveLength(LENS_CAP);
  });

  it("clears group + filters for a lens when it deactivates", () => {
    const state: LensState = {
      active: ["category", "priority"],
      group: "category",
      filters: { category: ["professional"], priority: ["3"] },
    };
    const off = toggleLens(state, "category");
    expect(off.active).toEqual(["priority"]);
    expect(off.group).toBeNull();
    expect(off.filters).toEqual({ priority: ["3"] });
  });

  it("evicts group/filters of a lens dropped by the cap", () => {
    let state: LensState = {
      active: ["category"],
      group: "category",
      filters: { category: ["adulting"] },
    };
    state = toggleLens(state, "priority"); // [category, priority]
    state = toggleLens(state, "project"); // cap drops category → group/filter gone
    expect(state.active).toEqual(["priority", "project"]);
    expect(state.group).toBeNull();
    expect(state.filters).toEqual({});
  });

  it("is pure — never mutates the input", () => {
    const input: LensState = { active: ["category"], group: null, filters: {} };
    toggleLens(input, "due");
    expect(input).toEqual({ active: ["category"], group: null, filters: {} });
  });
});

describe("setGroupLens", () => {
  it("designates an already-active lens as the group", () => {
    const state: LensState = { active: ["category", "priority"], group: null, filters: {} };
    expect(setGroupLens(state, "priority").group).toBe("priority");
  });

  it("activates an inactive lens before grouping (respecting the cap)", () => {
    const next = setGroupLens(EMPTY_LENS, "due");
    expect(next.active).toContain("due");
    expect(next.group).toBe("due");
  });

  it("clears grouping when passed null or the current group", () => {
    const state: LensState = { active: ["category"], group: "category", filters: {} };
    expect(setGroupLens(state, null).group).toBeNull();
    expect(setGroupLens(state, "category").group).toBeNull();
  });
});

describe("toggleFilterValue", () => {
  it("adds then removes a value, activating the lens as needed", () => {
    let state = toggleFilterValue(EMPTY_LENS, "category", "professional");
    expect(state.active).toContain("category");
    expect(state.filters.category).toEqual(["professional"]);
    state = toggleFilterValue(state, "category", "professional");
    expect(state.filters.category ?? []).toEqual([]);
  });

  it("stacks multiple values within one lens (OR)", () => {
    let state = toggleFilterValue(EMPTY_LENS, "category", "professional");
    state = toggleFilterValue(state, "category", "relationships");
    expect(state.filters.category).toEqual(["professional", "relationships"]);
  });
});

describe("hasActiveFilters", () => {
  it("is true only when an active lens has values", () => {
    expect(hasActiveFilters(EMPTY_LENS)).toBe(false);
    const state: LensState = {
      active: ["category"],
      group: null,
      filters: { category: ["adulting"] },
    };
    expect(hasActiveFilters(state)).toBe(true);
  });
});

describe("isLensActive / revealFlagsFromLens", () => {
  it("reflects membership", () => {
    const state: LensState = { active: ["project"], group: null, filters: {} };
    expect(isLensActive(state, "project")).toBe(true);
    expect(isLensActive(state, "category")).toBe(false);
  });

  it("maps active lenses to reveal flags", () => {
    const state: LensState = { active: ["category", "due"], group: "category", filters: {} };
    expect(revealFlagsFromLens(state)).toEqual({ category: true, due: true });
  });
});

describe("serialize / parse round-trip", () => {
  it("round-trips active + group + filters", () => {
    const state: LensState = {
      active: ["category", "priority"],
      group: "category",
      filters: { category: ["professional", "adulting"], priority: ["3"] },
    };
    expect(parseLens(serializeLens(state))).toEqual(state);
  });

  it("returns empty for null / empty input", () => {
    expect(parseLens(null)).toEqual(EMPTY_LENS);
    expect(parseLens("")).toEqual(EMPTY_LENS);
  });

  it("ignores unknown tokens and re-applies the cap to tampered storage", () => {
    const parsed = parseLens("category,priority,project,due|bogus|category:x");
    expect(parsed.active).toHaveLength(LENS_CAP);
    expect(parsed.active).toEqual(["project", "due"]);
    // group 'bogus' is invalid → null; category filter dropped (category not active)
    expect(parsed.group).toBeNull();
    expect(parsed.filters).toEqual({});
  });

  it("drops a group that isn't among the active lenses", () => {
    const parsed = parseLens("category|priority|");
    expect(parsed.group).toBeNull();
  });
});
