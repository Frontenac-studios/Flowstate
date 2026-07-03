import { describe, expect, it } from "vitest";
import {
  SURFACE_TOOL_NAMES,
  toolsForRegister,
  toolsForSurface,
} from "@/lib/chat/chat-tool-catalog";

describe("toolsForRegister", () => {
  it("limits focus to minimal silent-capable tools", () => {
    expect(toolsForRegister("focus").map((t) => t.name)).toEqual([
      "query_tasks",
      "complete_task",
      "park_in_abyss",
    ]);
  });

  it("includes the expanded planning write catalog", () => {
    const names = toolsForRegister("planning").map((t) => t.name);
    expect(names).toContain("edit_task");
    expect(names).toContain("delete_task");
    expect(names).toContain("set_top3");
    expect(names).toContain("replan_project_dates");
  });
});
describe("toolsForSurface", () => {
  it("covers all planning surfaces", () => {
    for (const surface of [
      "today",
      "week",
      "plan",
      "projects",
      "backlog",
      "reviews",
      "care",
    ] as const)
      expect(toolsForSurface("planning", surface).map((t) => t.name)).toEqual(
        SURFACE_TOOL_NAMES[surface]
      );
  });
});
