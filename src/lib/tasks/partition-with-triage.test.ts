import { describe, expect, it } from "vitest";

import { partitionPlanTasks } from "./partition-plan-tasks";
import { isTriageCandidate } from "./triage-candidates";

describe("triage + today partition", () => {
  const todayIso = "2026-05-26";

  it("excludes triage carryovers from today list when filtered", () => {
    const tasks = [
      {
        id: "carry",
        scheduledDate: "2026-05-25",
        bucketOverride: null,
        completedAt: null,
      },
      {
        id: "today",
        scheduledDate: todayIso,
        bucketOverride: null,
        completedAt: null,
      },
    ];

    const triageIds = new Set(tasks.filter((t) => isTriageCandidate(t, todayIso)).map((t) => t.id));
    const forPlan = tasks.filter((t) => !triageIds.has(t.id));
    const partitioned = partitionPlanTasks(forPlan, new Date("2026-05-26T12:00:00"));

    expect(partitioned.today.map((t) => t.id)).toEqual(["today"]);
  });
});
