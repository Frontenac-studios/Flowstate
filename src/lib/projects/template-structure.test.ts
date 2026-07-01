import { describe, expect, it } from "vitest";

import {
  buildTemplateStructureFromProject,
  countTemplateItems,
  projectTemplateStructureSchema,
} from "@/lib/projects/template-structure";

describe("buildTemplateStructureFromProject", () => {
  it("captures root tasks, phases, subphases, and duration hints", () => {
    const structure = buildTemplateStructureFromProject(
      [
        { id: "phase-a", parentPhaseId: null, name: "Discovery", sortOrder: 0 },
        { id: "phase-b", parentPhaseId: "phase-a", name: "Interviews", sortOrder: 0 },
      ],
      [
        { phaseId: null, title: "Kickoff", timeEstimateMinutes: null, sortOrder: 0 },
        { phaseId: "phase-a", title: "Research plan", timeEstimateMinutes: 90, sortOrder: 0 },
        { phaseId: "phase-b", title: "Schedule calls", timeEstimateMinutes: 45, sortOrder: 0 },
      ]
    );

    expect(structure).toEqual({
      rootTasks: [{ title: "Kickoff" }],
      phases: [
        {
          name: "Discovery",
          tasks: [{ title: "Research plan", timeEstimateMinutes: 90 }],
          subphases: [
            {
              name: "Interviews",
              tasks: [{ title: "Schedule calls", timeEstimateMinutes: 45 }],
            },
          ],
        },
      ],
    });

    expect(projectTemplateStructureSchema.parse(structure)).toEqual(structure);
    expect(countTemplateItems(structure)).toEqual({ phaseCount: 2, taskCount: 3 });
  });
});
