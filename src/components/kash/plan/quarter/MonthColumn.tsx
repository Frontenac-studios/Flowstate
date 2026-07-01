"use client";

import { useDroppable } from "@dnd-kit/core";

import type { QuarterGoalFields } from "@/lib/planning/quarter-goals";
import { monthShortName } from "@/lib/planning/quarter-months";
import { categorySolidVar } from "@/lib/projects/category-tokens";

type Props = {
  month: number;
  goals: QuarterGoalFields[];
  selectedGoalId: string | null;
  onAssignSelected: () => void;
  onZoomMonth?: () => void;
};

export default function MonthColumn({
  month,
  goals,
  selectedGoalId,
  onAssignSelected,
  onZoomMonth,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `month:${month}` });

  const handleColumnClick = () => {
    if (selectedGoalId) {
      onAssignSelected();
      return;
    }
    onZoomMonth?.();
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[160px] flex-col gap-2 rounded-card border p-3 transition ${
        isOver ? "border-ink-muted ring-2 ring-ink-muted" : "border-subtle bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={handleColumnClick}
        className="text-left text-sm font-semibold text-ink hover:underline"
        aria-label={`${monthShortName(month)}${selectedGoalId ? ", assign selected goal" : ", zoom to month"}`}
      >
        {monthShortName(month)}
      </button>

      <ul className="flex flex-1 flex-col gap-1.5">
        {goals.length === 0 ? (
          <li className="text-caption text-ink-faint">—</li>
        ) : (
          goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center gap-2 rounded-control border border-subtle bg-surface-2 px-2 py-1.5 text-sm text-ink"
            >
              <span
                className="h-4 w-0.5 shrink-0 rounded-full"
                style={{ backgroundColor: categorySolidVar(goal.category) }}
                aria-hidden
              />
              <span className="truncate">{goal.title}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
