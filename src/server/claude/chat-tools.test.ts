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
    expect(names).toContain("create_phase");
    expect(names).toContain("delete_phase");
  });
});
describe("toolsForSurface", () => {
  it("exposes both park_in_abyss and create_task on the backlog surface", () => {
    const names = toolsForSurface("planning", "backlog").map((t) => t.name);
    expect(names).toContain("park_in_abyss");
    expect(names).toContain("create_task");
  });

  it("exposes phase CRUD on every planning surface", () => {
    for (const surface of [
      "today",
      "week",
      "plan",
      "projects",
      "loose-tasks",
      "backlog",
      "reviews",
      "care",
      "morning-handoff",
    ] as const) {
      const names = toolsForSurface("planning", surface).map((t) => t.name);
      expect(names).toContain("create_phase");
      expect(names).toContain("edit_phase");
      expect(names).toContain("delete_phase");
    }
  });

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

  it("goals coach exposes only goal reads + the goal-proposing write + the learning adjustment, no task tools", () => {
    const names = toolsForSurface("goals", "goals").map((t) => t.name);
    expect(names).toEqual([
      "query_goals",
      "query_past_goals",
      "propose_bingo_goals",
      "set_goal_coaching_adjustment",
    ]);
    for (const banned of [
      "create_task",
      "edit_task",
      "delete_task",
      "query_tasks",
      "reschedule_tasks",
      "set_top3",
      "draft_week",
      "create_phase",
      "delete_phase",
    ]) {
      expect(names).not.toContain(banned);
    }
  });
});
