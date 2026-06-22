import { describe, expect, it } from "vitest";

import {
  EMPTY_LENS,
  LENS_CAP,
  isLensActive,
  parseLens,
  revealFlagsFromLens,
  serializeLens,
  toggleLens,
  type LensState,
} from "./lens";

describe("toggleLens", () => {
  it("turns an inactive lens on", () => {
    expect(toggleLens(EMPTY_LENS, "category")).toEqual({ active: ["category"] });
  });

  it("turns an active lens off", () => {
    const on: LensState = { active: ["category"] };
    expect(toggleLens(on, "category")).toEqual({ active: [] });
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

  it("does not count toggling-off against the cap", () => {
    let state: LensState = { active: ["category", "priority"] };
    state = toggleLens(state, "category"); // [priority]
    state = toggleLens(state, "due"); // [priority, due] — still within cap
    expect(state.active).toEqual(["priority", "due"]);
  });

  it("is pure — never mutates the input", () => {
    const input: LensState = { active: ["category"] };
    toggleLens(input, "due");
    expect(input).toEqual({ active: ["category"] });
  });
});

describe("isLensActive", () => {
  it("reflects membership", () => {
    const state: LensState = { active: ["project"] };
    expect(isLensActive(state, "project")).toBe(true);
    expect(isLensActive(state, "category")).toBe(false);
  });
});

describe("revealFlagsFromLens", () => {
  it("maps active lenses to reveal flags", () => {
    expect(revealFlagsFromLens({ active: ["category", "due"] })).toEqual({
      category: true,
      due: true,
    });
  });

  it("is empty when no lens is active", () => {
    expect(revealFlagsFromLens(EMPTY_LENS)).toEqual({});
  });
});

describe("serialize / parse round-trip", () => {
  it("round-trips a state through storage form", () => {
    const state: LensState = { active: ["priority", "category"] };
    expect(parseLens(serializeLens(state))).toEqual(state);
  });

  it("returns empty for null / empty input", () => {
    expect(parseLens(null)).toEqual(EMPTY_LENS);
    expect(parseLens("")).toEqual(EMPTY_LENS);
  });

  it("ignores unknown and duplicate tokens", () => {
    expect(parseLens("category, bogus, category, due")).toEqual({
      active: ["category", "due"],
    });
  });

  it("re-applies the cap to tampered storage", () => {
    expect(parseLens("category,priority,project,due").active).toHaveLength(LENS_CAP);
    expect(parseLens("category,priority,project,due").active).toEqual(["project", "due"]);
  });
});
