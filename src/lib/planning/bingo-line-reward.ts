import { BINGO_CELL_COUNT, BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";

import { BINGO_LINES, type BingoCell } from "./bingo-grid";

export type BingoLineType = "row" | "column" | "diagonal";

export type BingoRewardTier = "first" | "double" | "blackout";

const STORAGE_PREFIX = "kash-bingo-rewards";

function storageKey(cardYear: number): string {
  return `${STORAGE_PREFIX}-${cardYear}`;
}

export type BingoRewardState = {
  linesAwarded: number;
  blackoutShown: boolean;
};

export function readBingoRewardState(cardYear: number): BingoRewardState {
  if (typeof window === "undefined") return { linesAwarded: 0, blackoutShown: false };
  try {
    const raw = window.localStorage.getItem(storageKey(cardYear));
    if (!raw) return { linesAwarded: 0, blackoutShown: false };
    const parsed = JSON.parse(raw) as Partial<BingoRewardState>;
    return {
      linesAwarded: typeof parsed.linesAwarded === "number" ? parsed.linesAwarded : 0,
      blackoutShown: Boolean(parsed.blackoutShown),
    };
  } catch {
    return { linesAwarded: 0, blackoutShown: false };
  }
}

export function writeBingoRewardState(cardYear: number, state: BingoRewardState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(cardYear), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Stable signature for a completed line (sorted cell indices). */
export function lineSignature(line: readonly number[]): string {
  return [...line].sort((a, b) => a - b).join(",");
}

/** Classify a winning line as row, column, or diagonal. */
export function classifyLine(line: readonly number[]): BingoLineType {
  const sorted = [...line].sort((a, b) => a - b);
  const first = sorted[0] ?? 0;
  const n = 5;
  const isRow = sorted.every((idx, i) => idx === Math.floor(first / n) * n + i);
  if (isRow) return "row";
  const isCol = sorted.every((idx, i) => idx === (first % n) + i * n);
  if (isCol) return "column";
  return "diagonal";
}

/** Find lines completed on grid that were not in previouslyAwardedSignatures. */
export function newlyCompletedLines(
  grid: BingoCell[],
  previouslyAwardedSignatures: ReadonlySet<string>
): { line: number[]; type: BingoLineType; signature: string }[] {
  const fresh: { line: number[]; type: BingoLineType; signature: string }[] = [];
  for (const line of BINGO_LINES) {
    const sig = lineSignature(line);
    if (previouslyAwardedSignatures.has(sig)) continue;
    const complete = line.every((index) => {
      const cell = grid[index];
      if (!cell) return false;
      if (cell.kind === "free") return true;
      if (cell.kind === "goal") return cell.goal.state === "done";
      return false;
    });
    if (complete) {
      fresh.push({ line: [...line], type: classifyLine(line), signature: sig });
    }
  }
  return fresh;
}

/** Whether all 24 non-free goal cells are done. */
export function isBlackoutComplete(grid: BingoCell[]): boolean {
  let placed = 0;
  let done = 0;
  for (const cell of grid) {
    if (cell.kind === "goal" && cell.cellIndex !== BINGO_FREE_CELL_INDEX) {
      placed += 1;
      if (cell.goal.state === "done") done += 1;
    }
  }
  return placed > 0 && done === placed && placed === BINGO_CELL_COUNT - 1;
}

export function rewardTierForLineCount(linesAwardedAfter: number): BingoRewardTier {
  if (linesAwardedAfter <= 1) return "first";
  return "double";
}

export function rewardToastMessage(tier: BingoRewardTier): string {
  if (tier === "blackout") return "Blackout! Every goal done — what a year.";
  if (tier === "double") return "Double bingo! Another line complete.";
  return "Bingo! A line complete.";
}
