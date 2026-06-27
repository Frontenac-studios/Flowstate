"use client";

import { completedLineCells, type BingoCell, type BingoGoal } from "@/lib/planning/bingo-grid";

import BingoCellTile from "./BingoCellTile";

type Props = {
  grid: BingoCell[];
  locked: boolean;
  pendingGoalId: string | null;
  onToggleDone: (goal: BingoGoal) => void;
  onBackburner: (goal: BingoGoal) => void;
  onRemove: (goal: BingoGoal) => void;
  onAdd: (cellIndex: number) => void;
};

export default function BingoGrid({
  grid,
  locked,
  pendingGoalId,
  onToggleDone,
  onBackburner,
  onRemove,
  onAdd,
}: Props) {
  const winningCells = completedLineCells(grid);

  return (
    <div className="grid grid-cols-5 gap-2" role="grid" aria-label="Annual goals bingo card">
      {grid.map((cell) => (
        <BingoCellTile
          key={cell.cellIndex}
          cell={cell}
          locked={locked}
          inWinningLine={winningCells.has(cell.cellIndex)}
          busy={cell.kind === "goal" && pendingGoalId === cell.goal.id}
          onToggleDone={onToggleDone}
          onBackburner={onBackburner}
          onRemove={onRemove}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
