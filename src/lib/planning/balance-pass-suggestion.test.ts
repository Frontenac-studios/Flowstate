import { describe, expect, it } from "vitest";

import { resolveBalancePassSuggestion } from "./balance-pass-suggestion";

describe("resolveBalancePassSuggestion", () => {
  it("uses a Backlog candidate when one exists for the category", () => {
    expect(
      resolveBalancePassSuggestion(
        {
          abyssItemId: "abyss-1",
          taskId: "task-1",
          title: "Walk more",
          category: "body_mind",
        },
        "Body & Mind"
      )
    ).toEqual({
      taskTitle: "Walk more",
      taskId: "task-1",
      source: "abyss",
    });
  });

  it("falls back to a generated small-win title when Backlog is empty", () => {
    expect(resolveBalancePassSuggestion(undefined, "Relationships")).toEqual({
      taskTitle: "Small win for Relationships",
      taskId: null,
      source: "generated",
    });
  });
});
