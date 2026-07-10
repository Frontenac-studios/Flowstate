import { describe, expect, it } from "vitest";

import {
  captureContextPlaceholder,
  captureContextSchema,
  createCaptureContext,
  formatCaptureContextBlock,
} from "./capture-context";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const PHASE_ID = "00000000-0000-4000-8000-000000000002";

describe("capture-context", () => {
  it("validates a minimal week capture context", () => {
    const ctx = createCaptureContext({ surface: "week", defaultBucket: "inbox" });
    expect(captureContextSchema.safeParse(ctx).success).toBe(true);
  });

  it("validates a projects capture context with phase", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      projectId: PROJECT_ID,
      projectSlug: "kitchen-reno",
      phaseId: PHASE_ID,
      phaseName: "Demolition",
      category: "adulting",
    });
    const parsed = captureContextSchema.safeParse(ctx);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid surface", () => {
    expect(
      captureContextSchema.safeParse({
        surface: "invalid",
        openedAt: new Date().toISOString(),
      }).success
    ).toBe(false);
  });

  it("rejects invalid projectId", () => {
    expect(
      captureContextSchema.safeParse({
        surface: "projects",
        projectId: "not-a-uuid",
        openedAt: new Date().toISOString(),
      }).success
    ).toBe(false);
  });

  it("createCaptureContext stamps openedAt", () => {
    const before = Date.now();
    const ctx = createCaptureContext({ surface: "today" });
    const after = Date.now();
    const openedAt = new Date(ctx.openedAt).getTime();
    expect(openedAt).toBeGreaterThanOrEqual(before);
    expect(openedAt).toBeLessThanOrEqual(after);
  });

  it("round-trips through JSON serialization", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      projectId: PROJECT_ID,
      projectSlug: "kitchen-reno",
      phaseId: PHASE_ID,
      phaseName: "Demolition",
      category: "adulting",
    });
    const parsed = captureContextSchema.parse(JSON.parse(JSON.stringify(ctx)));
    expect(parsed).toEqual(ctx);
  });

  it("formatCaptureContextBlock includes project slug and phase name", () => {
    const block = formatCaptureContextBlock(
      createCaptureContext({
        surface: "projects",
        projectSlug: "kitchen-reno",
        phaseName: "Demolition",
        category: "adulting",
      })
    );
    expect(block).toContain("Surface: projects");
    expect(block).toContain("Project: #kitchen-reno");
    expect(block).toContain("Phase: Demolition");
    expect(block).toContain("Category: adulting");
  });

  it("formatCaptureContextBlock shows inbox default for week", () => {
    const block = formatCaptureContextBlock(
      createCaptureContext({ surface: "week", defaultBucket: "inbox" })
    );
    expect(block).toContain("Default bucket: inbox");
    expect(block).not.toContain("Project:");
  });

  it("formatCaptureContextBlock shows project loose when phaseId is null", () => {
    const block = formatCaptureContextBlock(
      createCaptureContext({
        surface: "projects",
        projectSlug: "kitchen-reno",
        phaseId: null,
      })
    );
    expect(block).toContain("Phase: (project loose)");
  });
});

describe("captureContextPlaceholder", () => {
  it("clarifies Today chat captures to the inbox (Option B)", () => {
    expect(captureContextPlaceholder(createCaptureContext({ surface: "today" }))).toBe(
      "Add tasks to your inbox…"
    );
  });

  it("keeps the week inbox placeholder", () => {
    expect(
      captureContextPlaceholder(createCaptureContext({ surface: "week", defaultBucket: "inbox" }))
    ).toBe("Add tasks to inbox…");
  });

  it("names the phase when capturing on a project", () => {
    expect(
      captureContextPlaceholder(
        createCaptureContext({
          surface: "projects",
          projectSlug: "kitchen-reno",
          phaseName: "Demolition",
        })
      )
    ).toBe("Add tasks for Demolition…");
  });

  it("names the category for a loose-tasks row (no project)", () => {
    expect(
      captureContextPlaceholder(
        createCaptureContext({ surface: "projects", category: "adulting", defaultBucket: "inbox" })
      )
    ).toBe("Add Adulting tasks…");
  });

  it("prompts to plan a task from the backlog", () => {
    expect(
      captureContextPlaceholder(
        createCaptureContext({ surface: "backlog", defaultBucket: "inbox" })
      )
    ).toBe("Describe a task to plan…");
  });
});

// ---------------------------------------------------------------------------
// QA matrix (Phase 8): the shape of the capture context created from each +
// entry point. These are the values the client hands to the stream/apply path.
// ---------------------------------------------------------------------------
describe("capture context creation per surface", () => {
  it("Week +: inbox default, no project or category", () => {
    const ctx = createCaptureContext({ surface: "week", defaultBucket: "inbox" });
    expect(ctx.surface).toBe("week");
    expect(ctx.defaultBucket).toBe("inbox");
    expect(ctx.projectSlug).toBeUndefined();
    expect(ctx.category).toBeUndefined();
    expect(captureContextSchema.safeParse(ctx).success).toBe(true);
  });

  it("Today +: today default bucket but still a projectless capture (Option B)", () => {
    const ctx = createCaptureContext({ surface: "today", defaultBucket: "today" });
    expect(ctx.surface).toBe("today");
    expect(ctx.defaultBucket).toBe("today");
    expect(ctx.projectSlug).toBeUndefined();
  });

  it("row 2 — Projects/Demolition +: carries project id/slug and phase", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      projectId: PROJECT_ID,
      projectSlug: "demolition",
      phaseId: PHASE_ID,
      phaseName: "Demolition",
      category: "personal_projects",
    });
    expect(ctx.projectSlug).toBe("demolition");
    expect(ctx.phaseId).toBe(PHASE_ID);
    expect(ctx.phaseName).toBe("Demolition");
    expect(captureContextSchema.safeParse(ctx).success).toBe(true);
  });

  it("row 3 — category lens/loose row +: category only, no project or phase", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      category: "adulting",
      defaultBucket: "inbox",
    });
    expect(ctx.category).toBe("adulting");
    expect(ctx.projectId).toBeUndefined();
    expect(ctx.projectSlug).toBeUndefined();
    expect(ctx.phaseId).toBeUndefined();
    expect(captureContextSchema.safeParse(ctx).success).toBe(true);
  });

  it("row 7 — Backlog +: inbox default for the plan-a-task entry point", () => {
    const ctx = createCaptureContext({ surface: "backlog", defaultBucket: "inbox" });
    expect(ctx.surface).toBe("backlog");
    expect(ctx.defaultBucket).toBe("inbox");
  });
});
