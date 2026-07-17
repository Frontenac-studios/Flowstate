import { describe, expect, it } from "vitest";

import { applyLearnedDurations, averageDurationsByTitle } from "./learn-durations";
import type { ProjectTemplateStructure } from "./template-structure";

describe("averageDurationsByTitle", () => {
  it("averages minutes per normalized title", () => {
    const averages = averageDurationsByTitle([
      { title: "Write brief", minutes: 30 },
      { title: "write  brief", minutes: 50 },
      { title: "Ship", minutes: 10 },
    ]);

    expect(averages.get("write brief")).toBe(40);
    expect(averages.get("ship")).toBe(10);
  });
});

describe("applyLearnedDurations", () => {
  it("overlays matching task estimates and leaves others alone", () => {
    const structure: ProjectTemplateStructure = {
      rootTasks: [{ title: "Kickoff", timeEstimateMinutes: 15 }],
      phases: [
        {
          name: "Build",
          tasks: [{ title: "Write brief", timeEstimateMinutes: 20 }],
          subphases: [
            {
              name: "Polish",
              tasks: [{ title: "Unknown task" }],
              subphases: [],
            },
          ],
        },
      ],
    };

    const learned = applyLearnedDurations(structure, [
      { title: "Write brief", minutes: 45 },
      { title: "Write brief", minutes: 55 },
    ]);

    expect(learned.phases[0]?.tasks[0]?.timeEstimateMinutes).toBe(50);
    expect(learned.rootTasks[0]?.timeEstimateMinutes).toBe(15);
    expect(learned.phases[0]?.subphases[0]?.tasks[0]?.timeEstimateMinutes).toBeUndefined();
  });
});
