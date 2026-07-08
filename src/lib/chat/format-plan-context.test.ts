import { describe, expect, it } from "vitest";

import { computeWeekCategoryLoad } from "@/lib/week/week-category-load";

import {
  formatLooseTaskCounts,
  formatPlanTaskLines,
  formatProjectStructureBlock,
  formatWeekCategoryLoadSummary,
  type PlanTaskLine,
  type ProjectStructurePhase,
} from "./format-plan-context";

function taskLine(overrides: Partial<PlanTaskLine> = {}): PlanTaskLine {
  return {
    id: "t1",
    title: "Pay electric bill",
    isTop3: false,
    priority: 0,
    projectSlug: null,
    scheduledDate: null,
    category: "adulting",
    categoryUnresolved: false,
    suggestedScheduledDate: null,
    ...overrides,
  };
}

describe("formatPlanTaskLines", () => {
  it("renders (none) for an empty list", () => {
    expect(formatPlanTaskLines("Today bucket", [])).toBe("Today bucket: (none)");
  });

  it("renders category, inbox, and suggested markers", () => {
    const out = formatPlanTaskLines("Later", [
      taskLine({
        id: "abc",
        priority: 2,
        projectSlug: "slug",
        scheduledDate: null,
        suggestedScheduledDate: "2026-07-09",
      }),
    ]);

    expect(out).toBe(
      "Later:\n- id=abc | Pay electric bill (adulting, inbox, suggested 2026-07-09, #slug, p2)"
    );
  });

  it("row 1 context: an inbox task with an adulting category and suggested Thursday", () => {
    const out = formatPlanTaskLines("Later", [
      taskLine({
        id: "water",
        title: "Pay water bill",
        category: "adulting",
        scheduledDate: null,
        suggestedScheduledDate: "2026-07-09",
      }),
    ]);
    expect(out).toContain("adulting");
    expect(out).toContain("inbox");
    expect(out).toContain("suggested 2026-07-09");
  });

  it("marks unresolved category and a due date for scheduled tasks", () => {
    const out = formatPlanTaskLines("This week", [
      taskLine({
        id: "xyz",
        title: "Draft deck",
        isTop3: true,
        categoryUnresolved: true,
        scheduledDate: "2026-07-10",
      }),
    ]);

    expect(out).toContain("category unresolved");
    expect(out).toContain("top3");
    expect(out).toContain("due 2026-07-10");
    expect(out).not.toContain("inbox");
  });
});

describe("formatLooseTaskCounts", () => {
  it("returns empty string when there are no loose tasks", () => {
    expect(formatLooseTaskCounts([])).toBe("");
  });

  it("groups by category, omits zero counts, and buckets unresolved", () => {
    const out = formatLooseTaskCounts([
      { category: "adulting" },
      { category: "adulting" },
      { category: "relationships" },
      { category: "adulting", categoryUnresolved: true },
    ]);

    expect(out).toBe("Loose tasks (no project): relationships 1, adulting 2, uncategorized 1");
  });
});

describe("formatWeekCategoryLoadSummary", () => {
  it("reports nothing planned when the week is empty", () => {
    const snapshot = computeWeekCategoryLoad({ tasks: [], protectedBlocks: [] });
    expect(formatWeekCategoryLoadSummary(snapshot)).toBe("Week category load: nothing planned yet");
  });

  it("summarises weights and empty categories", () => {
    const snapshot = computeWeekCategoryLoad({
      tasks: [{ category: "professional", isTop3: true }, { category: "relationships" }],
      protectedBlocks: [{ category: "body_mind" }],
    });

    const out = formatWeekCategoryLoadSummary(snapshot);
    expect(out).toContain("Professional 3");
    expect(out).toContain("Relationships 1");
    expect(out).toContain("Body & Mind 1");
    expect(out).toContain("no attention: Personal Projects, Adulting");
  });
});

describe("formatProjectStructureBlock", () => {
  const phases: ProjectStructurePhase[] = [
    { id: "root-b", name: "Build", parentPhaseId: null, sortOrder: 1 },
    { id: "root-a", name: "Plan", parentPhaseId: null, sortOrder: 0 },
    { id: "sub-a1", name: "Research", parentPhaseId: "root-a", sortOrder: 0 },
  ];

  it("renders a tree with open counts and marks the selected phase", () => {
    const out = formatProjectStructureBlock({
      projectName: "Kitchen Remodel",
      phases,
      taskCountByPhaseId: { "root-a": 2, "sub-a1": 1, "root-b": 3 },
      selectedPhaseId: "sub-a1",
    });

    expect(out).toBe(
      [
        "Project structure — Kitchen Remodel:",
        "- Plan (2 open)",
        "  - Research (1 open) [selected]",
        "- Build (3 open)",
      ].join("\n")
    );
  });

  it("handles a project with no phases", () => {
    const out = formatProjectStructureBlock({
      projectName: "Empty",
      phases: [],
      taskCountByPhaseId: {},
    });
    expect(out).toBe("Project structure — Empty:\n- (no phases)");
  });
});
