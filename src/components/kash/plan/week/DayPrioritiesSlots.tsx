"use client";

import Link from "next/link";

export type DayPrioritySlotTask = {
  id: string;
  title: string;
  projectId: string | null;
  projectSlug: string | null;
  priorityOrder: number;
  completedAt: Date | null;
};

const SLOT_LABELS = ["①", "②", "③"] as const;

type SlotProps = {
  slot: 1 | 2 | 3;
  task: DayPrioritySlotTask;
  onUnpin: (taskId: string) => void;
};

function DayPrioritySlot({ slot, task, onUnpin }: SlotProps) {
  const label = SLOT_LABELS[slot - 1];
  const isCompleted = task.completedAt != null;

  return (
    <div data-day-priority-pin data-day-priority-slot={slot}>
      <div
        className={`flex min-h-[var(--row-min-height)] items-start gap-1.5 rounded-pill border border-accent border-l-[var(--stripe-width)] bg-surface py-1 pl-2 pr-7 ${
          isCompleted ? "opacity-90" : ""
        }`}
      >
        <span className="mt-0.5 shrink-0 text-[10px] text-accent" aria-hidden>
          {label}
        </span>
        <span className="mt-0.5 shrink-0 text-xs text-accent" aria-hidden>
          ★
        </span>
        <span
          className={`min-w-0 flex-1 break-words text-xs font-medium text-ink ${
            isCompleted ? "line-through opacity-60" : ""
          }`}
        >
          {task.title}
        </span>
        {task.projectSlug && task.projectId ? (
          <Link
            href={`/projects/${task.projectId}`}
            className="mt-0.5 shrink-0 rounded-pill border border-border bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted hover:text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            #{task.projectSlug}
          </Link>
        ) : null}
        <button
          type="button"
          className="absolute right-1.5 top-0.5 rounded-full px-1 text-sm leading-none text-ink-muted hover:text-ink"
          aria-label={`Unpin ${task.title}`}
          onClick={() => onUnpin(task.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

type Props = {
  pinnedBySlot: Map<number, DayPrioritySlotTask>;
  onUnpin: (taskId: string) => void;
  /** D21 — one-time pin hint on today's column. */
  showPinHint?: boolean;
  onDismissPinHint?: () => void;
};

/** Compact per-day priority slots for WeekColumn (WD1 / D5). */
export default function DayPrioritiesSlots({
  pinnedBySlot,
  onUnpin,
  showPinHint = false,
  onDismissPinHint,
}: Props) {
  const pinnedTasks = ([1, 2, 3] as const)
    .map((slot) => {
      const task = pinnedBySlot.get(slot);
      return task ? { slot, task } : null;
    })
    .filter((entry): entry is { slot: 1 | 2 | 3; task: DayPrioritySlotTask } => entry !== null);

  const showDefaultHint = pinnedTasks.length === 0 && !showPinHint;

  return (
    <section className="mt-1 px-1" aria-label="Priorities">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
        Priorities
      </p>
      <div className="flex flex-col gap-1">
        {showPinHint ? (
          <p className="rounded-row bg-surface-2 px-2 py-1 text-center text-[10px] leading-snug text-ink-muted">
            Swipe right on a task to pin
            {onDismissPinHint ? (
              <button
                type="button"
                className="ml-1 text-ink-faint underline underline-offset-2 hover:text-ink"
                onClick={onDismissPinHint}
              >
                Got it
              </button>
            ) : null}
          </p>
        ) : null}
        {showDefaultHint ? (
          <p className="px-1 py-0.5 text-center text-[10px] leading-snug text-ink-muted">
            Swipe right on a task to pin
          </p>
        ) : null}
        {pinnedTasks.map(({ slot, task }) => (
          <div key={task.id} className="relative">
            <DayPrioritySlot slot={slot} task={task} onUnpin={onUnpin} />
          </div>
        ))}
      </div>
    </section>
  );
}
