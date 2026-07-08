import { describe, expect, it } from "vitest";

import { planningSurfaceFromPathname } from "@/lib/chat/planning-surface";
import { createCaptureContext } from "@/lib/chat/capture-context";
import { GLOBAL_THREAD_ID, focusThreadId } from "@/lib/chat/threads";

import {
  buildChatSystemPrompt,
  buildSystemPrompt,
  registerForSurface,
  registerForThread,
} from "./system-prompts";

describe("system-prompts", () => {
  it("maps legacy surfaces to registers", () => {
    expect(registerForSurface("companion")).toBe("planning");
    expect(registerForSurface("narration")).toBe("focus");
    expect(registerForSurface("eod")).toBe("reflection");
    expect(registerForSurface("eow")).toBe("reflection");
    expect(registerForSurface("weekDraft")).toBe("planning");
  });

  it("selects focus register for focus threads", () => {
    expect(registerForThread(GLOBAL_THREAD_ID)).toBe("planning");
    expect(registerForThread(focusThreadId("00000000-0000-4000-8000-000000000099"))).toBe("focus");
  });

  it("includes shared Kash base in every prompt", () => {
    expect(buildSystemPrompt("companion")).toContain("You are Kash");
    expect(buildSystemPrompt("narration")).toContain("You are Kash");
    expect(buildSystemPrompt("eod")).toContain("You are Kash");
  });

  it("adds register-specific guidance", () => {
    expect(buildSystemPrompt("companion")).toContain("Register: Planning");
    expect(buildSystemPrompt("narration")).toContain("Register: Focus");
    expect(buildSystemPrompt("eod")).toContain("Register: Reflection");
  });

  it("includes values-alignment guidance in register prompts", () => {
    expect(buildSystemPrompt("companion")).toContain("Values alignment");
    expect(buildChatSystemPrompt(GLOBAL_THREAD_ID)).toContain("Values alignment");
    expect(buildSystemPrompt("narration")).toContain("Values alignment");
  });

  it("selects focus register for focus chat threads", () => {
    const focusId = focusThreadId("00000000-0000-4000-8000-000000000099");
    expect(buildChatSystemPrompt(focusId)).toContain("Register: Focus");
    expect(buildChatSystemPrompt(GLOBAL_THREAD_ID)).toContain("Register: Planning");
  });

  it("adds planning surface modifier for global chat on Today", () => {
    expect(buildChatSystemPrompt(GLOBAL_THREAD_ID, "today")).toContain("Surface: Today");
    expect(buildChatSystemPrompt(GLOBAL_THREAD_ID, "backlog")).toContain("Surface: Backlog");
    expect(buildChatSystemPrompt(GLOBAL_THREAD_ID, "reviews")).toContain("Surface: Reviews");
  });

  it("omits surface modifier for focus threads", () => {
    const focusId = focusThreadId("00000000-0000-4000-8000-000000000099");
    expect(buildChatSystemPrompt(focusId, "today")).not.toContain("Surface: Today");
  });

  it("adds capture modifier when capture context is present", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      projectSlug: "kitchen-reno",
      phaseName: "Demolition",
    });
    const prompt = buildChatSystemPrompt(GLOBAL_THREAD_ID, "projects", ctx);
    expect(prompt).toContain("Capture mode:");
    expect(prompt).toContain("opened + to add tasks from projects");
  });

  it("tells Today capture to land in the inbox, not today's list", () => {
    const ctx = createCaptureContext({ surface: "today", defaultBucket: "today" });
    const prompt = buildChatSystemPrompt(GLOBAL_THREAD_ID, "today", ctx);
    expect(prompt).toContain("land in the inbox");
    expect(prompt).toContain("Today composer adds to today's list");
  });

  it("tells Backlog capture to prefer park_in_abyss over create_task", () => {
    const ctx = createCaptureContext({ surface: "backlog", defaultBucket: "inbox" });
    const prompt = buildChatSystemPrompt(GLOBAL_THREAD_ID, "backlog", ctx);
    expect(prompt).toContain("Prefer park_in_abyss");
    expect(prompt).toContain("create_task only when the user clearly wants an actionable");
  });

  it("defaults Projects capture to the selected project and phase", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      projectSlug: "kitchen-reno",
      phaseName: "Demolition",
    });
    const prompt = buildChatSystemPrompt(GLOBAL_THREAD_ID, "projects", ctx);
    expect(prompt).toContain('Default new tasks to #kitchen-reno · the "Demolition" phase');
  });

  it("marks the project loose bucket when phaseId is null", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      projectSlug: "kitchen-reno",
      phaseId: null,
    });
    const prompt = buildChatSystemPrompt(GLOBAL_THREAD_ID, "projects", ctx);
    expect(prompt).toContain("the project's loose bucket");
  });

  it("defaults loose-row capture to a category with no project", () => {
    const ctx = createCaptureContext({
      surface: "projects",
      category: "adulting",
      defaultBucket: "inbox",
    });
    const prompt = buildChatSystemPrompt(GLOBAL_THREAD_ID, "projects", ctx);
    expect(prompt).toContain("Default new tasks to loose adulting tasks (a category, no project)");
  });

  it("omits capture modifier when capture context is absent", () => {
    expect(buildChatSystemPrompt(GLOBAL_THREAD_ID, "week")).not.toContain("Capture mode:");
  });

  it("omits capture modifier for focus threads even with capture context", () => {
    const focusId = focusThreadId("00000000-0000-4000-8000-000000000099");
    const ctx = createCaptureContext({ surface: "today" });
    expect(buildChatSystemPrompt(focusId, "today", ctx)).not.toContain("Capture mode:");
  });
});

describe("planningSurfaceFromPathname", () => {
  it("maps routes to planning surfaces", () => {
    expect(planningSurfaceFromPathname("/today")).toBe("today");
    expect(planningSurfaceFromPathname("/this-week")).toBe("week");
    expect(planningSurfaceFromPathname("/plan")).toBe("plan");
    expect(planningSurfaceFromPathname("/projects/foo")).toBe("projects");
    expect(planningSurfaceFromPathname("/abyss")).toBe("backlog");
    expect(planningSurfaceFromPathname("/care")).toBe("care");
  });
});
