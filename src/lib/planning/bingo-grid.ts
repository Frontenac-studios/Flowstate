import { BINGO_CELL_COUNT, BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

/** The bingo card is a square — 5×5 = 25 cells (§7.1). */
export const BINGO_GRID_DIMENSION = 5;

export type BingoGoalState = "active" | "done" | "backburnered";

/** The subset of a goal row the bingo grid needs to render and score. */
export type BingoGoal = {
  id: string;
  title: string;
  category: ProjectCategory;
  cellIndex: number | null;
  state: BingoGoalState;
};

/** A single positioned square: the FREE center, an empty slot, or a placed goal. */
export type BingoCell =
  | { kind: "free"; cellIndex: number }
  | { kind: "empty"; cellIndex: number }
  | { kind: "goal"; cellIndex: number; goal: BingoGoal };

function isGridCell(index: number | null | undefined): index is number {
  return index != null && index !== BINGO_FREE_CELL_INDEX && index >= 0 && index < BINGO_CELL_COUNT;
}

/**
 * Places goals onto the fixed 25-square grid. Cell 12 is always FREE; squares
 * without a goal are `empty`. If two goals claim one square (the DB unique index
 * prevents this per card) the later one wins.
 */
export function buildGrid(goals: BingoGoal[]): BingoCell[] {
  const byCell = new Map<number, BingoGoal>();
  for (const goal of goals) {
    if (isGridCell(goal.cellIndex)) byCell.set(goal.cellIndex, goal);
  }

  const cells: BingoCell[] = [];
  for (let index = 0; index < BINGO_CELL_COUNT; index += 1) {
    if (index === BINGO_FREE_CELL_INDEX) {
      cells.push({ kind: "free", cellIndex: index });
      continue;
    }
    const goal = byCell.get(index);
    cells.push(
      goal ? { kind: "goal", cellIndex: index, goal } : { kind: "empty", cellIndex: index }
    );
  }
  return cells;
}

/** The 12 winning lines: 5 rows, 5 columns, 2 diagonals (the FREE center is on one diagonal). */
export const BINGO_LINES: readonly (readonly number[])[] = (() => {
  const n = BINGO_GRID_DIMENSION;
  const lines: number[][] = [];
  for (let r = 0; r < n; r += 1) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c += 1) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  lines.push(Array.from({ length: n }, (_, i) => i * n + i));
  lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return lines;
})();

/**
 * Whether a square counts toward a winning line: the FREE center always does,
 * a goal only when `done`. Empty, active, and backburnered squares break the line —
 * a line cannot pass through a backburnered square (§7.2).
 */
function cellCountsForLine(cell: BingoCell): boolean {
  if (cell.kind === "free") return true;
  if (cell.kind === "goal") return cell.goal.state === "done";
  return false;
}

/** The winning lines that are fully complete on the current grid. */
export function completedLines(grid: BingoCell[]): number[][] {
  return BINGO_LINES.filter((line) => line.every((index) => cellCountsForLine(grid[index]))).map(
    (line) => [...line]
  );
}

/** The set of cell indices that belong to at least one completed line (for highlighting). */
export function completedLineCells(grid: BingoCell[]): Set<number> {
  const cells = new Set<number>();
  for (const line of completedLines(grid)) {
    for (const index of line) cells.add(index);
  }
  return cells;
}

/** Count of placed goals per category — drives the balance read across the grid. */
export function categoryBalance(goals: BingoGoal[]): Record<ProjectCategory, number> {
  const counts = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c, 0])) as Record<
    ProjectCategory,
    number
  >;
  for (const goal of goals) {
    if (isGridCell(goal.cellIndex)) counts[goal.category] += 1;
  }
  return counts;
}

/** Done / total across placed (non-FREE) squares. Progress reads as done, not %. */
export function cardProgress(goals: BingoGoal[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const goal of goals) {
    if (!isGridCell(goal.cellIndex)) continue;
    total += 1;
    if (goal.state === "done") done += 1;
  }
  return { done, total };
}
