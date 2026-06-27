import { describe, expect, it } from "vitest";

import {
  BINGO_GRID_DIMENSION,
  BINGO_LINES,
  buildGrid,
  cardProgress,
  categoryBalance,
  completedLineCells,
  completedLines,
  type BingoGoal,
} from "@/lib/planning/bingo-grid";
import { BINGO_CELL_COUNT, BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";

let nextId = 0;
function goal(cellIndex: number | null, overrides: Partial<BingoGoal> = {}): BingoGoal {
  nextId += 1;
  return {
    id: `g${nextId}`,
    title: `Goal ${nextId}`,
    category: "professional",
    cellIndex,
    state: "active",
    ...overrides,
  };
}

describe("buildGrid", () => {
  it("produces 25 cells with FREE in the center", () => {
    const grid = buildGrid([]);
    expect(grid).toHaveLength(BINGO_CELL_COUNT);
    expect(grid[BINGO_FREE_CELL_INDEX].kind).toBe("free");
    expect(grid.filter((c) => c.kind === "empty")).toHaveLength(BINGO_CELL_COUNT - 1);
  });

  it("places a goal on its square and leaves the rest empty", () => {
    const grid = buildGrid([goal(0, { title: "Ship v2" })]);
    const cell = grid[0];
    expect(cell.kind).toBe("goal");
    if (cell.kind === "goal") expect(cell.goal.title).toBe("Ship v2");
    expect(grid[1].kind).toBe("empty");
  });

  it("never renders a goal on the FREE center", () => {
    const grid = buildGrid([goal(BINGO_FREE_CELL_INDEX)]);
    expect(grid[BINGO_FREE_CELL_INDEX].kind).toBe("free");
  });

  it("ignores unplaced (panel-only) goals", () => {
    const grid = buildGrid([goal(null)]);
    expect(grid.every((c) => c.kind !== "goal")).toBe(true);
  });
});

describe("BINGO_LINES", () => {
  it("has 12 lines of 5 squares each (5 rows + 5 cols + 2 diagonals)", () => {
    expect(BINGO_LINES).toHaveLength(2 * BINGO_GRID_DIMENSION + 2);
    expect(BINGO_LINES.every((line) => line.length === BINGO_GRID_DIMENSION)).toBe(true);
  });

  it("includes the FREE center on a diagonal", () => {
    const onDiagonal = BINGO_LINES.some((line) => line.includes(BINGO_FREE_CELL_INDEX));
    expect(onDiagonal).toBe(true);
  });
});

describe("completedLines", () => {
  it("treats the FREE center as already complete", () => {
    // The main diagonal is 0, 6, 12 (free), 18, 24 — only the four goals must be done.
    const goals = [0, 6, 18, 24].map((i) => goal(i, { state: "done" }));
    const lines = completedLines(buildGrid(goals));
    expect(lines).toContainEqual([0, 6, 12, 18, 24]);
  });

  it("does not complete a line with an active or empty square", () => {
    const goals = [0, 6, 18].map((i) => goal(i, { state: "done" })); // 24 left empty
    expect(completedLines(buildGrid(goals))).toHaveLength(0);
  });

  it("a backburnered square blocks the line it sits on", () => {
    const goals = [
      goal(0, { state: "done" }),
      goal(1, { state: "done" }),
      goal(2, { state: "backburnered" }),
      goal(3, { state: "done" }),
      goal(4, { state: "done" }),
    ];
    expect(completedLines(buildGrid(goals))).toHaveLength(0);
  });

  it("completedLineCells unions every square of every completed line", () => {
    const goals = [0, 6, 18, 24].map((i) => goal(i, { state: "done" }));
    const cells = completedLineCells(buildGrid(goals));
    expect(Array.from(cells).sort((a, b) => a - b)).toEqual([0, 6, 12, 18, 24]);
  });
});

describe("categoryBalance", () => {
  it("counts only placed goals, per category", () => {
    const balance = categoryBalance([
      goal(0, { category: "professional" }),
      goal(1, { category: "professional" }),
      goal(2, { category: "body_mind" }),
      goal(null, { category: "adulting" }), // unplaced — not counted
    ]);
    expect(balance.professional).toBe(2);
    expect(balance.body_mind).toBe(1);
    expect(balance.adulting).toBe(0);
  });
});

describe("cardProgress", () => {
  it("reports done over total placed squares", () => {
    const goals = [
      goal(0, { state: "done" }),
      goal(1, { state: "done" }),
      goal(2, { state: "active" }),
      goal(3, { state: "backburnered" }),
      goal(null, { state: "done" }), // unplaced — excluded
    ];
    expect(cardProgress(goals)).toEqual({ done: 2, total: 4 });
  });

  it("is zero on an empty card", () => {
    expect(cardProgress([])).toEqual({ done: 0, total: 0 });
  });
});
