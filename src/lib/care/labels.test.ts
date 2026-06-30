import { describe, expect, it } from "vitest";

import { CADENCE_OPTIONS, cadenceLabel, groupByTheme, THEME_LABELS, THEME_ORDER } from "./labels";
import { CARE_THEMES } from "./types";

describe("cadenceLabel", () => {
  it("labels each cadence and treats null/undefined as no rhythm", () => {
    expect(cadenceLabel("daily")).toBe("Daily");
    expect(cadenceLabel("most_days")).toBe("Most days");
    expect(cadenceLabel("when_needed")).toBe("When needed");
    expect(cadenceLabel(null)).toBeNull();
    expect(cadenceLabel(undefined)).toBeNull();
  });
});

describe("CADENCE_OPTIONS", () => {
  it("leads with a no-rhythm option then the four cadences", () => {
    expect(CADENCE_OPTIONS[0]).toEqual({ value: "", label: "No set rhythm" });
    expect(CADENCE_OPTIONS).toHaveLength(5);
  });
});

describe("THEME_LABELS / THEME_ORDER", () => {
  it("covers every theme in catalog order", () => {
    expect(THEME_ORDER).toEqual(CARE_THEMES);
    for (const theme of CARE_THEMES) {
      expect(typeof THEME_LABELS[theme]).toBe("string");
    }
  });
});

describe("groupByTheme", () => {
  it("groups in THEME_ORDER and drops empty themes", () => {
    const items = [
      { id: "1", theme: "reflect" as const },
      { id: "2", theme: "move" as const },
      { id: "3", theme: "move" as const },
    ];
    const groups = groupByTheme(items);

    expect(groups.map((g) => g.theme)).toEqual(["move", "reflect"]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["2", "3"]);
    expect(groups[0]!.label).toBe("Move");
    expect(groups[1]!.items).toHaveLength(1);
  });

  it("returns an empty array when there are no items", () => {
    expect(groupByTheme([])).toEqual([]);
  });
});
