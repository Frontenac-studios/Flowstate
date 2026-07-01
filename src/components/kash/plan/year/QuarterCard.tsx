"use client";

import { useDroppable } from "@dnd-kit/core";

import type { YearHeatQuarter } from "@/lib/planning/year-heat";

import QuarterBalanceBar from "./QuarterBalanceBar";
import QuarterWeekDots from "./QuarterWeekDots";

type Props = {
  quarter: YearHeatQuarter;
  themePhrase: string | null;
  isFutureQuarter: boolean;
  isDropTarget: boolean;
  selectedGoalId: string | null;
  onZoom: () => void;
  onAssignSelected: () => void;
};

export default function QuarterCard({
  quarter,
  themePhrase,
  isFutureQuarter,
  isDropTarget,
  selectedGoalId,
  onZoom,
  onAssignSelected,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `quarter:${quarter.quarter}` });

  const untitled = !themePhrase?.trim();
  const totalActivity = Object.values(quarter.categoryWeights).reduce((a, b) => a + b, 0);
  const emptyQuarter = untitled && totalActivity === 0;

  const handleClick = () => {
    if (selectedGoalId) {
      onAssignSelected();
      return;
    }
    onZoom();
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={handleClick}
      className={`rounded-card border p-4 text-left transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
        emptyQuarter ? "border-dashed border-subtle opacity-70" : "border-subtle bg-surface"
      } ${isFutureQuarter && !emptyQuarter ? "opacity-85" : ""} ${
        isOver || isDropTarget ? "ring-2 ring-ink-muted" : "hover:border-ink-muted"
      }`}
      aria-label={`Quarter ${quarter.quarter}${themePhrase ? `, ${themePhrase}` : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-subtitle font-semibold text-ink">Q{quarter.quarter}</span>
        <span className={`truncate text-xs ${untitled ? "text-ink-faint" : "text-ink-muted"}`}>
          {untitled ? "untitled" : themePhrase}
        </span>
      </div>

      <QuarterBalanceBar weights={quarter.categoryWeights} />
      <QuarterWeekDots weeks={quarter.weeks} />

      {emptyQuarter ? (
        <p className="mt-3 text-caption text-ink-faint">drag a goal here to set its horizon</p>
      ) : isFutureQuarter && totalActivity === 0 ? (
        <p className="mt-3 text-caption text-ink-faint">planned · lighter load</p>
      ) : null}
    </button>
  );
}
