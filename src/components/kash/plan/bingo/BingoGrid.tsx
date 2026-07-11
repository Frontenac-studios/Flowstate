"use client";

import { completedLineCells, type BingoCell, type BingoGoal } from "@/lib/planning/bingo-grid";
import type { ProjectCategory } from "@/lib/projects/categories";

import BingoCellTile from "./BingoCellTile";

type Props = {
  grid: BingoCell[];
  locked: boolean;
  locking?: boolean;
  pendingGoalId: string | null;
  editingCell: number | null;
  addBusy: boolean;
  addError: string | null;
  onToggleDone: (goal: BingoGoal) => void;
  onBackburner: (goal: BingoGoal) => void;
  onRemove: (goal: BingoGoal) => void;
  onAdd: (cellIndex: number) => void;
  onAddSubmit: (title: string, category: ProjectCategory, valueId: string | null) => void;
  onAddCancel: () => void;
  onOpenGoal?: (goal: BingoGoal) => void;
};

export default function BingoGrid({
  grid,
  locked,
  locking = false,
  pendingGoalId,
  editingCell,
  addBusy,
  addError,
  onToggleDone,
  onBackburner,
  onRemove,
  onAdd,
  onAddSubmit,
  onAddCancel,
  onOpenGoal,
}: Props) {
  const winningCells = completedLineCells(grid);

  return (
    <div
      className={`grid grid-cols-5 gap-2 overflow-visible ${locking ? "bingo-lock-grid" : ""}`}
      role="grid"
      aria-label="Annual goals bingo card"
    >
      {grid.map((cell) => (
        <BingoCellTile
          key={cell.cellIndex}
          cell={cell}
          locked={locked}
          locking={locking}
          inWinningLine={winningCells.has(cell.cellIndex)}
          busy={cell.kind === "goal" && pendingGoalId === cell.goal.id}
          editingCell={editingCell}
          addBusy={addBusy}
          addError={addError}
          onToggleDone={onToggleDone}
          onBackburner={onBackburner}
          onRemove={onRemove}
          onAdd={onAdd}
          onAddSubmit={onAddSubmit}
          onAddCancel={onAddCancel}
          onOpenGoal={onOpenGoal}
        />
      ))}
    </div>
  );
}
