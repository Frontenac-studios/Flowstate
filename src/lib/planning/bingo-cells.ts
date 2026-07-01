import { BINGO_CELL_COUNT, BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";

export function isValidBingoCellIndex(index: number | null | undefined): boolean {
  if (index == null) return true;
  if (!Number.isInteger(index) || index < 0 || index >= BINGO_CELL_COUNT) return false;
  return index !== BINGO_FREE_CELL_INDEX;
}

export function assertEditableBingoCell(index: number): void {
  if (index === BINGO_FREE_CELL_INDEX) {
    throw new Error("Cell 12 is the FREE center and cannot hold a goal.");
  }
  if (!isValidBingoCellIndex(index)) {
    throw new Error(`cell_index must be 0–24 (excluding ${BINGO_FREE_CELL_INDEX}).`);
  }
}

/** Next empty cell index on the card (skips FREE center). */
export function nextEmptyCellIndex(occupied: ReadonlySet<number>): number | null {
  for (let i = 0; i < BINGO_CELL_COUNT; i += 1) {
    if (i === BINGO_FREE_CELL_INDEX) continue;
    if (!occupied.has(i)) return i;
  }
  return null;
}
