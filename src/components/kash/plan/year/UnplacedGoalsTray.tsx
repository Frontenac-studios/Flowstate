"use client";

import { useDraggable } from "@dnd-kit/core";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { GoalHorizonFields } from "@/lib/planning/year-goals";

type Props = {
  goals: GoalHorizonFields[];
  selectedGoalId: string | null;
  onSelectGoal: (goalId: string | null) => void;
};

function DraggableGoalChip({
  goal,
  selected,
  onSelect,
}: {
  goal: GoalHorizonFields;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `goal:${goal.id}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      style={style}
      onClick={onSelect}
      className={`inline-flex max-w-full items-center gap-2 rounded-card border px-3 py-1.5 text-sm text-ink transition ${
        selected ? "border-ink bg-surface-2" : "border-subtle bg-surface hover:border-ink-muted"
      } ${isDragging ? "opacity-60" : ""}`}
      aria-pressed={selected}
    >
      <span
        className="h-4 w-0.5 shrink-0 rounded-full"
        style={{ backgroundColor: categorySolidVar(goal.category) }}
        aria-hidden
      />
      <span className="truncate">{goal.title}</span>
    </button>
  );
}

export default function UnplacedGoalsTray({ goals, selectedGoalId, onSelectGoal }: Props) {
  if (goals.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-ink-muted">
        Unplaced goals — drag onto a quarter or tap a goal then tap a quarter
      </p>
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => (
          <DraggableGoalChip
            key={goal.id}
            goal={goal}
            selected={selectedGoalId === goal.id}
            onSelect={() => onSelectGoal(selectedGoalId === goal.id ? null : goal.id)}
          />
        ))}
      </div>
    </div>
  );
}
