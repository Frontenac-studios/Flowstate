import { describe, expect, it } from "vitest";

import {
  formatCreateTaskPlacementSummary,
  mergeCreateTaskPlacementSources,
  resolveCreateTaskCategory,
  resolvePhaseIdForProject,
} from "./resolve-create-task-placement";

const phases = [
  { id: "p1", name: "Demolition", parentPhaseId: null },
  { id: "p2", name: "Framing", parentPhaseId: null },
  { id: "p3", name: "Rough-in", parentPhaseId: "p2" },
];

describe("mergeCreateTaskPlacementSources", () => {
  it("prefers confirm edits over proposal and capture context", () => {
    const merged = mergeCreateTaskPlacementSources(
      { projectSlug: "reno", phaseName: "Demolition", category: "professional" },
      { projectSlug: "other", phaseId: "p2", category: "adulting" },
      {
        surface: "projects",
        projectSlug: "reno",
        phaseName: "Demolition",
        category: "personal_projects",
        openedAt: new Date().toISOString(),
      }
    );
    expect(merged.projectSlug).toBe("other");
    expect(merged.phaseId).toBe("p2");
    expect(merged.category).toBe("adulting");
  });

  it("falls back to capture context when proposal omits fields", () => {
    const merged = mergeCreateTaskPlacementSources({}, undefined, {
      surface: "projects",
      projectSlug: "reno",
      phaseId: "p1",
      category: "professional",
      openedAt: new Date().toISOString(),
    });
    expect(merged.projectSlug).toBe("reno");
    expect(merged.phaseId).toBe("p1");
    expect(merged.category).toBe("professional");
  });
});

describe("resolvePhaseIdForProject", () => {
  it("uses explicit phaseId when provided", () => {
    expect(resolvePhaseIdForProject(phases, "p3", null)).toBe("p3");
  });

  it("resolves phase by name within the project", () => {
    expect(resolvePhaseIdForProject(phases, undefined, "demolition")).toBe("p1");
  });

  it("returns null for project loose bucket", () => {
    expect(resolvePhaseIdForProject(phases, null, null)).toBeNull();
  });
});

describe("resolveCreateTaskCategory", () => {
  it("follows explicit > project > capture context", () => {
    expect(
      resolveCreateTaskCategory({
        explicit: "body_mind",
        projectCategory: "professional",
        captureContextCategory: "adulting",
      })
    ).toBe("body_mind");

    expect(
      resolveCreateTaskCategory({
        explicit: null,
        projectCategory: "professional",
        captureContextCategory: "adulting",
      })
    ).toBe("professional");

    expect(
      resolveCreateTaskCategory({
        explicit: null,
        projectCategory: null,
        captureContextCategory: "adulting",
      })
    ).toBe("adulting");
  });
});

describe("formatCreateTaskPlacementSummary", () => {
  it("describes inbox landing with category and project", () => {
    expect(
      formatCreateTaskPlacementSummary({
        category: "adulting",
        projectName: null,
        phaseName: null,
        landing: "inbox",
      })
    ).toBe("Adulting · no project · inbox");

    expect(
      formatCreateTaskPlacementSummary({
        category: "professional",
        projectName: "Kitchen Reno",
        phaseName: "Demolition",
        landing: "inbox",
      })
    ).toBe("Professional · Kitchen Reno · Demolition · inbox");
  });
});
