"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";

export type Top3SlotTask = {
  id: string;
  title: string;
  projectId: string | null;
  projectSlug: string | null;
  top3Order: number;
  completedAt: Date | null;
};

const SLOT_LABELS = ["①", "②", "③"] as const;

type SlotProps = {
  slot: 1 | 2 | 3;
  task: Top3SlotTask;
  onUnpin: (taskId: string) => void;
};

function Top3Slot({ slot, task, onUnpin }: SlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `top3:${slot}` });
  const label = SLOT_LABELS[slot - 1];
  const isCompleted = task.completedAt != null;

  return (
    <div
      ref={setNodeRef}
      data-top3-pin
      data-top3-slot={slot}
      className={`relative transition-shadow ${
        isOver ? "kash-section-drop-target rounded-[var(--radius-card)]" : ""
      }`}
    >
      <div
        className={`flex min-h-[var(--row-min-height)] items-start gap-2 rounded-pill border border-l-[3px] border-accent bg-surface py-[var(--row-py)] pl-3 pr-9 ${
          isCompleted ? "opacity-90" : ""
        }`}
      >
        <span className="mt-0.5 shrink-0 text-xs text-accent" aria-hidden>
          {label}
        </span>
        <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
          ★
        </span>
        <span
          className={`min-w-0 flex-1 break-words text-sm font-medium text-ink ${
            isCompleted ? "line-through opacity-60" : ""
          }`}
        >
          {task.title}
        </span>
        {task.projectSlug && task.projectId ? (
          <Link
            href={`/projects/${task.projectId}`}
            className="mt-0.5 shrink-0 rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted hover:text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            #{task.projectSlug}
          </Link>
        ) : null}
        <button
          type="button"
          className="absolute right-2 top-1 rounded-full px-1.5 text-sm leading-none text-ink-muted hover:text-ink"
          aria-label={`Unpin ${task.title}`}
          onClick={() => onUnpin(task.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Top3HintDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "top3:next" });

  return (
    <div
      ref={setNodeRef}
      data-top3-hint
      className={`flex min-h-[var(--row-min-height)] w-full items-center text-center text-xs text-ink-muted transition ${
        isOver ? "kash-section-drop-target rounded-[var(--radius-card)] ring-2 ring-accent" : ""
      }`}
    >
      Swipe right on a task to your top three priorities for today
    </div>
  );
}

function Top3NextDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "top3:next" });

  return (
    <div
      ref={setNodeRef}
      className={`h-2 transition ${isOver ? "kash-section-drop-target rounded-[var(--radius-card)]" : ""}`}
      aria-hidden
    />
  );
}

type Props = {
  pinnedBySlot: Map<number, Top3SlotTask>;
  onUnpin: (taskId: string) => void;
  highlighted?: boolean;
};

export const Top3Slots = forwardRef<HTMLElement, Props>(function Top3Slots(
  { pinnedBySlot, onUnpin, highlighted = false },
  ref
) {
  const pinnedTasks = ([1, 2, 3] as const)
    .map((slot) => {
      const task = pinnedBySlot.get(slot);
      return task ? { slot, task } : null;
    })
    .filter((entry): entry is { slot: 1 | 2 | 3; task: Top3SlotTask } => entry !== null);

  const pinnedCount = pinnedTasks.length;
  const showHint = pinnedCount === 0;
  const showNextDropZone = pinnedCount > 0 && pinnedCount < 3;

  return (
    <section
      ref={ref}
      data-top3-section
      className={`mt-4 ${highlighted ? "kash-section-pulse rounded-[var(--radius-card)]" : ""}`}
      aria-labelledby="top3-heading"
    >
      <h2
        id="top3-heading"
        className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted"
      >
        Today&apos;s Priorities
      </h2>
      <div className="flex flex-col gap-2">
        {showHint ? <Top3HintDropZone /> : null}
        {pinnedTasks.map(({ slot, task }) => (
          <Top3Slot key={task.id} slot={slot} task={task} onUnpin={onUnpin} />
        ))}
        {showNextDropZone ? <Top3NextDropZone /> : null}
      </div>
    </section>
  );
});
