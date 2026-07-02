import { describe, expect, it } from "vitest";

import { parseGoalIdFromNudgeTaskIds, pickRotatedGoalId } from "./goal-steering-rotation";

describe("pickRotatedGoalId", () => {
  it("returns null when there are no goals", () => {
    expect(pickRotatedGoalId([], new Map())).toBeNull();
  });

  it("prefers a goal that has never been offered", () => {
    const history = new Map([["g1", "2026-07-01"]]);
    expect(pickRotatedGoalId(["g1", "g2"], history)).toBe("g2");
  });

  it("rotates to the least-recently-offered goal", () => {
    const history = new Map([
      ["g1", "2026-07-01"],
      ["g2", "2026-06-15"],
      ["g3", "2026-07-02"],
    ]);
    expect(pickRotatedGoalId(["g1", "g2", "g3"], history)).toBe("g2");
  });

  it("preserves sort order when offer dates tie", () => {
    const history = new Map([
      ["g1", "2026-07-01"],
      ["g2", "2026-07-01"],
    ]);
    expect(pickRotatedGoalId(["g1", "g2"], history)).toBe("g1");
  });
});

describe("parseGoalIdFromNudgeTaskIds", () => {
  it("reads the first task id slot as goal id", () => {
    expect(parseGoalIdFromNudgeTaskIds(["goal-abc"])).toBe("goal-abc");
  });

  it("returns null for empty payloads", () => {
    expect(parseGoalIdFromNudgeTaskIds([])).toBeNull();
    expect(parseGoalIdFromNudgeTaskIds(undefined)).toBeNull();
  });
});
