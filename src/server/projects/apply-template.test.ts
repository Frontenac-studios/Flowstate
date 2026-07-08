import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ProjectCategory } from "@/lib/projects/categories";

// Replicate taskValues from apply-template.ts — keeps the backlog contract testable
// without spinning up a full DB transaction.
function taskValues(
  userId: string,
  projectId: string,
  category: ProjectCategory,
  phaseId: string | null,
  task: { title: string; timeEstimateMinutes?: number | null },
  sortOrder: number
) {
  return {
    userId,
    projectId,
    phaseId,
    title: task.title.trim(),
    category,
    priority: 0,
    sortOrder,
    timeEstimateMinutes: task.timeEstimateMinutes ?? null,
    scheduledDate: null,
    bucketOverride: "later" as const,
    suggestedScheduledDate: null,
  };
}

describe("applyProjectTemplate taskValues", () => {
  it("lands template tasks in project backlog, not Today", () => {
    const userId = randomUUID();
    const projectId = randomUUID();
    const phaseId = randomUUID();

    const values = taskValues(
      userId,
      projectId,
      "professional",
      phaseId,
      { title: "  Draft brief  " },
      0
    );

    expect(values.scheduledDate).toBeNull();
    expect(values.bucketOverride).toBe("later");
    expect(values.suggestedScheduledDate).toBeNull();
    expect(values.title).toBe("Draft brief");
    expect(values.phaseId).toBe(phaseId);
  });
});
