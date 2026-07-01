import { describe, expect, it } from "vitest";

import { BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";

import { buildGrid, type BingoGoal } from "./bingo-grid";
import {
  classifyLine,
  isBlackoutComplete,
  lineSignature,
  newlyCompletedLines,
  rewardToastMessage,
} from "./bingo-line-reward";

function doneGoal(cellIndex: number): BingoGoal {
  return {
    id: `g-${cellIndex}`,
    title: `Goal ${cellIndex}`,
    category: "professional",
    cellIndex,
    state: "done",
  };
}

describe("bingo-line-reward", () => {
  it("detects a newly completed row", () => {
    const goals = Array.from({ length: 5 }, (_, c) => doneGoal(c));
    const grid = buildGrid(goals);
    const fresh = newlyCompletedLines(grid, new Set());
    expect(fresh.length).toBeGreaterThanOrEqual(1);
    expect(fresh[0]?.type).toBe("row");
  });

  it("skips previously awarded lines", () => {
    const goals = Array.from({ length: 5 }, (_, c) => doneGoal(c));
    const grid = buildGrid(goals);
    const line = [0, 1, 2, 3, 4];
    const sig = lineSignature(line);
    const fresh = newlyCompletedLines(grid, new Set([sig]));
    expect(fresh.every((f) => f.signature !== sig)).toBe(true);
  });

  it("classifies column lines", () => {
    expect(classifyLine([0, 5, 10, 15, 20])).toBe("column");
  });

  it("detects blackout when all placed goals are done", () => {
    const goals: BingoGoal[] = [];
    for (let i = 0; i < 25; i += 1) {
      if (i === BINGO_FREE_CELL_INDEX) continue;
      goals.push(doneGoal(i));
    }
    expect(isBlackoutComplete(buildGrid(goals))).toBe(true);
  });

  it("formats reward messages by tier", () => {
    expect(rewardToastMessage("first")).toMatch(/Bingo/i);
    expect(rewardToastMessage("blackout")).toMatch(/Blackout/i);
  });
});
