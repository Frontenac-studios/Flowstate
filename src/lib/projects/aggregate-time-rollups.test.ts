import { describe, expect, it } from "vitest";

import {
  aggregateSecondsByTask,
  entrySeconds,
  rollupProjectPhaseTime,
} from "./aggregate-time-rollups";

describe("entrySeconds", () => {
  it("counts running entries to now", () => {
    const now = new Date("2026-07-02T12:00:00.000Z");
    expect(
      entrySeconds({ startedAt: new Date("2026-07-02T11:00:00.000Z"), endedAt: null }, now)
    ).toBe(3600);
  });
});

describe("rollupProjectPhaseTime", () => {
  it("sums subtree seconds per phase and project total", () => {
    const byTaskSeconds = aggregateSecondsByTask([
      {
        taskId: "t1",
        startedAt: new Date("2026-07-01T10:00:00.000Z"),
        endedAt: new Date("2026-07-01T11:00:00.000Z"),
      },
      {
        taskId: "t2",
        startedAt: new Date("2026-07-01T12:00:00.000Z"),
        endedAt: new Date("2026-07-01T12:30:00.000Z"),
      },
    ]);

    const result = rollupProjectPhaseTime({
      tasks: [
        { id: "t1", phaseId: "sub" },
        { id: "t2", phaseId: "root" },
      ],
      phases: [
        { id: "root", parentPhaseId: null },
        { id: "sub", parentPhaseId: "root" },
      ],
      byTaskSeconds,
    });

    expect(result.projectSeconds).toBe(5400);
    expect(result.byPhaseId.root).toBe(5400);
    expect(result.byPhaseId.sub).toBe(3600);
  });
});
