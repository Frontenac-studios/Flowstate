import { describe, expect, it } from "vitest";

import {
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
