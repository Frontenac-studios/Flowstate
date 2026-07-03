"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";

import { categorySolidVar, categoryFillVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

import { GhostCategoryStrip } from "@/components/kash/ui/GhostCategoryStrip";

import { Top3Deadline } from "./Top3Deadline";
import { Top3SlipChip } from "./Top3SlipChip";
import "@/components/kash/ui/feedback-motion.css";

export type Top3SlotTask = {
  id: string;
  title: string;
  projectId: string | null;
  projectSlug: string | null;
  top3Order: number;
  top3PinnedAt: Date | null;
  scheduledDate: string | null;
  completedAt: Date | null;
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
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
  const starColor =
    task.category && !task.categoryUnresolved ? categorySolidVar(task.category) : "var(--accent)";

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
        className={`flex min-h-[var(--row-min-height)] items-start gap-2 rounded-pill border border-accent border-l-[var(--stripe-width)] bg-surface py-[var(--row-py)] pl-3 pr-9 ${
          isCompleted ? "opacity-90" : ""
        }`}
      >
        <span className="mt-0.5 shrink-0 text-xs text-accent" aria-hidden>
          {label}
        </span>
        <span className="mt-0.5 shrink-0" style={{ color: starColor }} aria-hidden>
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
            className="mt-0.5 shrink-0 rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted underline underline-offset-2 hover:text-accent"
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

/**
 * D11/V3: one compact row until the first pin — category-tinted slot dots + invitation.
 * Full ghost slots appear only after the first priority lands (via Top3NextDropZone).
 */
function Top3CompactRow() {
  const { setNodeRef, isOver } = useDroppable({ id: "top3:next" });

  return (
    <div
      ref={setNodeRef}
      data-top3-hint
      data-top3-compact
      className={`flex flex-wrap items-center gap-2 rounded-pill border border-dashed border-border px-3 py-2 transition ${
        isOver ? "kash-section-drop-target ring-2 ring-accent" : ""
      }`}
    >
      <span className="text-caption font-medium uppercase tracking-wide text-ink-muted">Top 3</span>
      {PROJECT_CATEGORIES.slice(0, 3).map((category) => (
        <span
          key={category}
          className="size-3 shrink-0 rounded-full border"
          style={{
            borderColor: categorySolidVar(category),
            backgroundColor: categoryFillVar(category),
          }}
          aria-hidden
        />
      ))}
      <span className="min-w-0 flex-1 text-xs text-ink-muted">
        Pin your first priority — full slots appear then
      </span>
      <GhostCategoryStrip className="hidden w-28 sm:flex sm:w-36" />
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
  middayLine?: string | null;
  slipTask?: {
    id: string;
    title: string;
    top3Order: number;
    daysSlipped: number;
    pinReferenceDate: string;
  } | null;
  onSlipBreakDown?: (taskId: string) => void;
  onSlipDrop?: (taskId: string) => void;
  onSlipKeep?: (taskId: string) => void;
};

export const Top3Slots = forwardRef<HTMLElement, Props>(function Top3Slots(
  {
    pinnedBySlot,
    onUnpin,
    highlighted = false,
    middayLine = null,
    slipTask = null,
    onSlipBreakDown,
    onSlipDrop,
    onSlipKeep,
  },
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

  if (showHint) {
    return (
      <section
        ref={ref}
        data-top3-section
        className={`mt-4 ${highlighted ? "kash-section-pulse rounded-[var(--radius-card)]" : ""}`}
        aria-labelledby="top3-heading"
      >
        <h2 id="top3-heading" className="sr-only">
          Today&apos;s Priorities
        </h2>
        <Top3CompactRow />
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-top3-section
      className={`mt-4 ${highlighted ? "kash-section-pulse rounded-[var(--radius-card)]" : ""}`}
      aria-labelledby="top3-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          id="top3-heading"
          className="text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          Today&apos;s Priorities
        </h2>
        <Top3Deadline visible={pinnedCount > 0} />
      </div>
      <div className="flex flex-col gap-2">
        {pinnedTasks.map(({ slot, task }) => (
          <Top3Slot key={task.id} slot={slot} task={task} onUnpin={onUnpin} />
        ))}
        {showNextDropZone ? <Top3NextDropZone /> : null}
        {middayLine ? (
          <p className="nudge-fade-in px-1 text-center text-xs text-ink-muted">{middayLine}</p>
        ) : null}
      </div>
      {slipTask && onSlipBreakDown && onSlipDrop && onSlipKeep ? (
        <Top3SlipChip
          className="mt-2"
          task={slipTask}
          onBreakDown={() => onSlipBreakDown(slipTask.id)}
          onDrop={() => onSlipDrop(slipTask.id)}
          onKeep={() => onSlipKeep(slipTask.id)}
        />
      ) : null}
    </section>
  );
});
