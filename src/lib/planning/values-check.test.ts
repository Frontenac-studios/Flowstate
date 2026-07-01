import { describe, expect, it } from "vitest";

import { detectValuesMisalignment, valuesCheckLabel } from "./values-check";

const values = [
  { id: "v1", label: "Health" },
  { id: "v2", label: "Family" },
  { id: "v3", label: "Adventure" },
];

describe("detectValuesMisalignment", () => {
  it("returns null when the user has fewer than three values", () => {
    expect(
      detectValuesMisalignment(
        values.slice(0, 2),
        [{ valueId: "v1", state: "active", targetYear: 2026 }],
        2026
      )
    ).toBeNull();
  });

  it("returns null when every value appears in an active goal", () => {
    expect(
      detectValuesMisalignment(
        values,
        [
          { valueId: "v1", state: "active", targetYear: 2026 },
          { valueId: "v2", state: "active", targetYear: 2026 },
          { valueId: "v3", state: "active", targetYear: 2026 },
        ],
        2026
      )
    ).toBeNull();
  });

  it("flags quiet values when other values are represented", () => {
    const result = detectValuesMisalignment(
      values,
      [
        { valueId: "v1", state: "active", targetYear: 2026 },
        { valueId: "v1", state: "active", targetYear: 2026 },
      ],
      2026
    );
    expect(result?.quietValues.map((v) => v.label)).toEqual(["Family", "Adventure"]);
  });

  it("flags majority-untagged goals when values exist", () => {
    const result = detectValuesMisalignment(
      values,
      [
        { valueId: null, state: "active", targetYear: 2026 },
        { valueId: null, state: "active", targetYear: 2026 },
        { valueId: "v1", state: "active", targetYear: 2026 },
      ],
      2026
    );
    expect(result).not.toBeNull();
    expect(result?.quietValues).toEqual([]);
    expect(result?.untaggedGoalCount).toBe(2);
  });

  it("ignores inactive or out-of-year goals", () => {
    expect(
      detectValuesMisalignment(
        values,
        [
          { valueId: null, state: "completed", targetYear: 2026 },
          { valueId: null, state: "active", targetYear: 2025 },
        ],
        2026
      )
    ).toBeNull();
  });
});

describe("valuesCheckLabel", () => {
  it("uses calm copy for a single quiet value", () => {
    expect(
      valuesCheckLabel({
        quietValues: [{ id: "v3", label: "Adventure" }],
        untaggedGoalCount: 0,
        activeGoalCount: 2,
      })
    ).toBe("Adventure hasn't shown up in your goals lately — worth a glance?");
  });
});
