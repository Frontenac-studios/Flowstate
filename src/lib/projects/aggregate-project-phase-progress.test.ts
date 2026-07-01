import { describe, expect, it } from "vitest";

import { aggregateProjectPhaseProgress } from "./aggregate-project-phase-progress";

describe("aggregateProjectPhaseProgress", () => {
  it("rolls up weighted progress per project and phase", () => {
    const rows = aggregateProjectPhaseProgress(
      [
        { projectId: "p1", phaseId: "ph1", completed: true, isHeavy: true },
        { projectId: "p1", phaseId: "ph1", completed: false, isHeavy: false },
        { projectId: "p1", phaseId: null, completed: true, isHeavy: false },
      ],
      [{ id: "ph1", projectId: "p1", name: "Launch" }],
      new Map([["p1", "Book"]])
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.projectName).toBe("Book");
    expect(rows[0]?.percent).toBe(80);
    expect(rows[0]?.phases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phaseName: "Launch", percent: 75 }),
        expect.objectContaining({ phaseName: "No phase", percent: 100 }),
      ])
    );
  });
});
