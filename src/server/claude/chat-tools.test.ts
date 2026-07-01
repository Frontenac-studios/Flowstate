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
});
describe("toolsForSurface", () => {
  it("covers all six planning surfaces", () => {
    for (const surface of ["today", "week", "plan", "projects", "abyss", "reviews"] as const)
      expect(toolsForSurface("planning", surface).map((t) => t.name)).toEqual(
        SURFACE_TOOL_NAMES[surface]
      );
  });
});
