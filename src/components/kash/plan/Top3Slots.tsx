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
      className={`relative min-h-[4.5rem] flex-1 transition-shadow ${
        isOver ? "kash-section-drop-target rounded-[var(--kash-radius)]" : ""
      }`}
    >
      {task ? (
        <div
          className={`glass-pill flex h-full flex-col justify-center gap-1 border-l-[3px] border-kash-accent px-4 py-3 pr-9 ${
            isCompleted ? "opacity-90" : ""
          }`}
        >
          <button
            type="button"
            className="absolute right-2 top-2 rounded-full px-1.5 text-sm leading-none text-kash-ink-muted hover:text-kash-ink"
            aria-label={`Unpin ${task.title}`}
            onClick={() => onUnpin(task.id)}
          >
            ×
          </button>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-xs text-kash-accent" aria-hidden>
              {label}
            </span>
            <span className="shrink-0 text-kash-accent" aria-hidden>
              ★
            </span>
            <span
              className={`min-w-0 truncate text-sm font-medium text-kash-ink ${
                isCompleted ? "line-through opacity-60" : ""
              }`}
            >
              {task.title}
            </span>
          </div>
          {task.projectSlug && task.projectId ? (
            <Link
              href={`/projects/${task.projectId}`}
              className="glass-pill w-fit px-2 py-0.5 text-xs text-kash-ink-muted hover:text-kash-accent"
              onClick={(e) => e.stopPropagation()}
            >
              #{task.projectSlug}
            </Link>
          ) : null}
        </div>
      ) : (
        <div
          className={`flex h-full min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[var(--kash-radius)] border border-dashed px-3 py-3 ${
            isOver
              ? "border-kash-accent bg-[var(--kash-accent-soft)]"
              : "border-white/50 bg-white/25"
          }`}
          style={{ backdropFilter: "blur(12px)" }}
        >
          <span className="text-sm text-kash-accent" aria-hidden>
            {label}
          </span>
          <span className="text-center text-xs text-kash-ink-muted">pin a task</span>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([1, 2, 3] as const).map((slot) => (
          <Top3Slot key={slot} slot={slot} task={pinnedBySlot.get(slot)} onUnpin={onUnpin} />
        ))}
      </div>
    </section>
  );
}
