import { describe, expect, it } from "vitest";

import { computeDayLoad, computeWeekDayLoads } from "./day-load";

describe("computeDayLoad", () => {
  it("weights day priorities at 3 and regular tasks at 1", () => {
    const tasks = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const priorities = new Set(["a", "c"]);
    expect(computeDayLoad(tasks, priorities, 0)).toBe(7);
  });

  it("counts protected blocks fully toward load", () => {
    expect(computeDayLoad([{ id: "a" }], new Set(), 2)).toBe(3);
  });

  it("returns zero for an empty day", () => {
    expect(computeDayLoad([], new Set(), 0)).toBe(0);
  });
});

describe("computeWeekDayLoads", () => {
  it("maps loads per ISO date", () => {
    const loads = computeWeekDayLoads({
      dates: ["2026-06-01", "2026-06-02"],
      tasksByDate: {
        "2026-06-01": [{ id: "a" }],
        "2026-06-02": [{ id: "b" }, { id: "c" }],
      },
      priorityTaskIdsByDate: {
        "2026-06-02": new Set(["b"]),
      },
      protectedCountByDate: {
        "2026-06-01": 1,
      },
    });

    expect(loads["2026-06-01"]).toBe(2);
    expect(loads["2026-06-02"]).toBe(4);
  });
});
