"use client";

import Link from "next/link";
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
  task: Top3SlotTask | undefined;
  onUnpin: (taskId: string) => void;
};

function Top3Slot({ slot, task, onUnpin }: SlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `top3:${slot}` });
  const label = SLOT_LABELS[slot - 1];
  const isCompleted = task?.completedAt != null;

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-shadow ${
        isOver ? "kash-section-drop-target rounded-[var(--kash-radius)]" : ""
      }`}
    >
      {task ? (
        <div
          className={`glass-pill flex min-h-kash-row items-start gap-2 border-l-[3px] border-kash-accent py-2 pl-3 pr-9 ${
            isCompleted ? "opacity-90" : ""
          }`}
        >
          <span className="mt-0.5 shrink-0 text-xs text-kash-accent" aria-hidden>
            {label}
          </span>
          <span className="mt-0.5 shrink-0 text-kash-accent" aria-hidden>
            ★
          </span>
          <span
            className={`min-w-0 flex-1 break-words text-sm font-medium text-kash-ink ${
              isCompleted ? "line-through opacity-60" : ""
            }`}
          >
            {task.title}
          </span>
          {task.projectSlug && task.projectId ? (
            <Link
              href={`/projects/${task.projectId}`}
              className="glass-pill mt-0.5 shrink-0 px-2 py-0.5 text-xs text-kash-ink-muted hover:text-kash-accent"
              onClick={(e) => e.stopPropagation()}
            >
              #{task.projectSlug}
            </Link>
          ) : null}
          <button
            type="button"
            className="absolute right-2 top-2 rounded-full px-1.5 text-sm leading-none text-kash-ink-muted hover:text-kash-ink"
            aria-label={`Unpin ${task.title}`}
            onClick={() => onUnpin(task.id)}
          >
            ×
          </button>
        </div>
      ) : (
        <div
          className={`glass-panel flex min-h-kash-row items-center gap-2 px-3 py-2 transition ${
            isOver ? "ring-2 ring-kash-accent" : ""
          }`}
        >
          <span className="shrink-0 text-sm font-medium text-kash-accent" aria-hidden>
            {label}
          </span>
          <span className="text-xs text-kash-ink-muted">pin a task</span>
        </div>
      )}
    </div>
  );
}

type Props = {
  pinnedBySlot: Map<number, Top3SlotTask>;
  onUnpin: (taskId: string) => void;
};

export function Top3Slots({ pinnedBySlot, onUnpin }: Props) {
  return (
    <section className="mt-4" aria-labelledby="top3-heading">
      <h2
        id="top3-heading"
        className="mb-3 text-sm font-medium uppercase tracking-wide text-kash-ink-muted"
      >
        Top 3
      </h2>
      <div className="flex flex-col gap-2">
        {([1, 2, 3] as const).map((slot) => (
          <Top3Slot key={slot} slot={slot} task={pinnedBySlot.get(slot)} onUnpin={onUnpin} />
        ))}
      </div>
    </section>
  );
}
