import { describe, expect, it } from "vitest";

import {
  compareAbyssBalanceItems,
  pickAbyssBalanceCandidates,
  type AbyssBalanceItemInput,
} from "./abyss-balance-candidates";

function item(
  overrides: Partial<AbyssBalanceItemInput> & Pick<AbyssBalanceItemInput, "id" | "title">
): AbyssBalanceItemInput {
  return {
    type: "idea",
    category: "body_mind",
    promotedTaskId: null,
    resurfaceCount: 0,
    lastTouchedAt: new Date("2026-06-01T12:00:00Z"),
    ...overrides,
  };
}

describe("abyss-balance-candidates", () => {
  it("prefers task-type items over ideas in the same category", () => {
    const picked = pickAbyssBalanceCandidates(
      [
        item({ id: "1", title: "Idea first", type: "idea", resurfaceCount: 9 }),
        item({ id: "2", title: "Task wins", type: "task" }),
      ],
      ["body_mind"]
    );

    expect(picked).toEqual([{ taskId: null, title: "Task wins", category: "body_mind" }]);
  });

  it("ranks by resurface count then recency within the same type", () => {
    const picked = pickAbyssBalanceCandidates(
      [
        item({
          id: "1",
          title: "Older bright",
          resurfaceCount: 3,
          lastTouchedAt: new Date("2026-06-01T12:00:00Z"),
        }),
        item({
          id: "2",
          title: "Newer dim",
          resurfaceCount: 1,
          lastTouchedAt: new Date("2026-06-10T12:00:00Z"),
        }),
        item({
          id: "3",
          title: "Brightest",
          resurfaceCount: 4,
          lastTouchedAt: new Date("2026-05-01T12:00:00Z"),
        }),
      ],
      ["body_mind"]
    );

    expect(picked[0]?.title).toBe("Brightest");
  });

  it("returns one candidate per requested category and preserves order", () => {
    const picked = pickAbyssBalanceCandidates(
      [
        item({ id: "1", title: "Walk more", category: "body_mind" }),
        item({ id: "2", title: "Call mom", category: "relationships" }),
        item({ id: "3", title: "Side project", category: "personal_projects" }),
      ],
      ["relationships", "body_mind"]
    );

    expect(picked).toEqual([
      { taskId: null, title: "Call mom", category: "relationships" },
      { taskId: null, title: "Walk more", category: "body_mind" },
    ]);
  });

  it("passes through a linked task id when present", () => {
    const picked = pickAbyssBalanceCandidates(
      [item({ id: "1", title: "Promoted task", promotedTaskId: "task-abc", type: "task" })],
      ["body_mind"]
    );

    expect(picked[0]?.taskId).toBe("task-abc");
  });

  it("compareAbyssBalanceItems orders task before idea", () => {
    const idea = item({ id: "1", title: "Idea", type: "idea" });
    const task = item({ id: "2", title: "Task", type: "task" });
    expect(compareAbyssBalanceItems(task, idea)).toBeLessThan(0);
    expect(compareAbyssBalanceItems(idea, task)).toBeGreaterThan(0);
  });
});
