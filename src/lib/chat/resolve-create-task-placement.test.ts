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

  it("row 4: an explicit (resolved) category is shown, not 'no category'", () => {
    expect(
      formatCreateTaskPlacementSummary({
        category: "adulting",
        categoryUnresolved: false,
        projectName: null,
        phaseName: null,
        landing: "inbox",
      })
    ).toBe("Adulting · no project · inbox");
  });

  it("renders 'no category' when the AI resolver left it unresolved", () => {
    expect(
      formatCreateTaskPlacementSummary({
        category: "adulting",
        categoryUnresolved: true,
        projectName: null,
        phaseName: null,
        landing: "inbox",
      })
    ).toBe("no category · no project · inbox");
  });

  it("shows 'project loose' for a project task with no phase", () => {
    expect(
      formatCreateTaskPlacementSummary({
        category: "professional",
        projectName: "Kitchen Reno",
        phaseName: null,
        landing: "inbox",
      })
    ).toBe("Professional · Kitchen Reno · project loose · inbox");
  });
});

// ---------------------------------------------------------------------------
// QA matrix (Phase 8): the placement decision layer that apply-proposed-action
// delegates to. Each case maps to a matrix row.
// ---------------------------------------------------------------------------
describe("create-task placement — QA matrix", () => {
  const nowIso = () => new Date().toISOString();

  it("row 1: Week 'pay water bill Thursday' → inbox, adulting via capture, no project", () => {
    const placement = mergeCreateTaskPlacementSources(
      { projectSlug: null, phaseId: undefined, phaseName: null },
      undefined,
      { surface: "week", defaultBucket: "inbox", category: "adulting", openedAt: nowIso() }
    );
    expect(placement.projectSlug).toBeNull();
    // No project → no phase pinned; the created task's phaseId ends up null.
    expect(placement.phaseId).toBeUndefined();
    expect(placement.phaseName).toBeNull();
    // Explicit/proposal absent → capture context supplies the category.
    expect(
      resolveCreateTaskCategory({
        explicit: null,
        projectCategory: null,
        captureContextCategory: placement.category,
      })
    ).toBe("adulting");
  });

  it("row 2: Projects/Demolition 'order dumpster' resolves phaseId within the project", () => {
    const placement = mergeCreateTaskPlacementSources({}, undefined, {
      surface: "projects",
      projectSlug: "demolition",
      phaseName: "Demolition",
      category: "personal_projects",
      openedAt: nowIso(),
    });
    expect(placement.projectSlug).toBe("demolition");
    // Phase resolved by name against the project's phase list.
    expect(resolvePhaseIdForProject(phases, placement.phaseId, placement.phaseName)).toBe("p1");
    expect(
      resolveCreateTaskCategory({
        explicit: null,
        projectCategory: null,
        captureContextCategory: placement.category,
      })
    ).toBe("personal_projects");
  });

  it("row 3: category lens → explicit category, projectId/phaseId stay null", () => {
    const placement = mergeCreateTaskPlacementSources({ category: "adulting" }, undefined, {
      surface: "projects",
      category: "adulting",
      defaultBucket: "inbox",
      openedAt: nowIso(),
    });
    expect(placement.projectSlug).toBeNull();
    expect(placement.phaseName).toBeNull();
    expect(resolvePhaseIdForProject(phases, placement.phaseId, placement.phaseName)).toBeNull();
    expect(placement.category).toBe("adulting");
  });

  it("row 4: a confirm-card category edit wins over proposal and capture", () => {
    const placement = mergeCreateTaskPlacementSources(
      { category: "professional" },
      { category: "body_mind" },
      { surface: "week", category: "adulting", openedAt: nowIso() }
    );
    expect(placement.category).toBe("body_mind");
    // An edited/explicit category resolves without the AI ladder → unresolved: false.
    const category = resolveCreateTaskCategory({
      explicit: placement.category,
      projectCategory: null,
      captureContextCategory: null,
    });
    expect(category).toBe("body_mind");
    expect(
      formatCreateTaskPlacementSummary({
        category,
        categoryUnresolved: false,
        projectName: null,
        phaseName: null,
        landing: "inbox",
      })
    ).toContain("Body & Mind");
  });

  it("precedence: edit > proposal > capture context > resolver(null)", () => {
    // Nothing anywhere → resolver ladder returns null (apply falls back to AI).
    expect(
      resolveCreateTaskCategory({
        explicit: null,
        projectCategory: null,
        captureContextCategory: null,
      })
    ).toBeNull();

    // Capture beats nothing; proposal beats capture; edit beats all.
    expect(
      mergeCreateTaskPlacementSources({}, undefined, {
        surface: "week",
        category: "adulting",
        openedAt: nowIso(),
      }).category
    ).toBe("adulting");
    expect(
      mergeCreateTaskPlacementSources({ category: "professional" }, undefined, {
        surface: "week",
        category: "adulting",
        openedAt: nowIso(),
      }).category
    ).toBe("professional");
    expect(
      mergeCreateTaskPlacementSources(
        { category: "professional" },
        { category: "relationships" },
        { surface: "week", category: "adulting", openedAt: nowIso() }
      ).category
    ).toBe("relationships");
  });
});
