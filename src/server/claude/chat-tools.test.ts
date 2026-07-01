import { describe, expect, it } from "vitest";

import {
  SURFACE_TOOL_NAMES,
  toolsForRegister,
  toolsForSurface,
} from "@/lib/chat/chat-tool-catalog";

describe("chat-tools toolsForRegister", () => {
  it("exposes the full planning catalog", () => {
    const names = toolsForRegister("planning").map((t) => t.name);
    expect(names).toContain("query_tasks");
    expect(names).toContain("query_state");
    expect(names).toContain("query_projects");
    expect(names).toContain("query_abyss");
    expect(names).toContain("draft_week");
    expect(names).toContain("reschedule_tasks");
    expect(names).toContain("create_task");
    expect(names).toContain("complete_task");
    expect(names).toContain("park_in_abyss");
    expect(names).toContain("propose_about_me_edit");
  });

  it("limits focus to minimal silent-capable tools", () => {
    const names = toolsForRegister("focus").map((t) => t.name);
    expect(names).toEqual(["query_tasks", "complete_task", "park_in_abyss"]);
  });

  it("gives reflection read + draft + selective writes", () => {
    const names = toolsForRegister("reflection").map((t) => t.name);
    expect(names).toContain("query_state");
    expect(names).toContain("draft_eod");
    expect(names).toContain("reschedule_tasks");
    expect(names).not.toContain("create_task");
    expect(names).not.toContain("park_in_abyss");
  });
});

describe("toolsForSurface", () => {
  it("narrows planning tools per surface", () => {
    const today = toolsForSurface("planning", "today").map((t) => t.name);
    expect(today).toEqual(SURFACE_TOOL_NAMES.today);
    expect(today).toContain("reschedule_tasks");
    expect(today).not.toContain("draft_week");

    const abyss = toolsForSurface("planning", "abyss").map((t) => t.name);
    expect(abyss).toEqual(SURFACE_TOOL_NAMES.abyss);
    expect(abyss).toContain("park_in_abyss");
    expect(abyss).not.toContain("draft_week");
  });

  it("ignores surface for focus register", () => {
    const names = toolsForSurface("focus", "today").map((t) => t.name);
    expect(names).toEqual(["query_tasks", "complete_task", "park_in_abyss"]);
  });

  it("falls back to full planning catalog when surface is null", () => {
    expect(toolsForSurface("planning", null).length).toBe(toolsForRegister("planning").length);
  });
});
