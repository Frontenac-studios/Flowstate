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
