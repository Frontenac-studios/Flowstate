"use client";

import { useDroppable } from "@dnd-kit/core";
import { forwardRef } from "react";

import { formatHeaderDate, parseISODateString } from "@/lib/dates/local-day";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { categorySolidVar } from "@/lib/projects/category-tokens";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";

type Props = {
  isoDate: string;
  label: string;
  isToday: boolean;
  columnWidthPercent: number;
  tasks: PlanTaskRow[];
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

const NEUTRAL_DOT = "var(--ink-faint)";
const MAX_DOTS = 6;

/** Inverted "today" emphasis (Kash 3.0): the week is soft-gray, today is white. */
const GRAY_COLUMN = "color-mix(in srgb, var(--ink) 4%, var(--surface))";

export const WeekColumn = forwardRef<HTMLDivElement, Props>(function WeekColumn(
  { isoDate, label, isToday, columnWidthPercent, tasks, onComplete, onDelete },
  ref
) {
  const { setNodeRef, isOver } = useDroppable({ id: `week-day:${isoDate}` });
  const headerDate = formatHeaderDate(parseISODateString(isoDate));

  // Per-category load cue: one dot per task (colour = its life-area), capped.
  const dots = tasks.slice(0, MAX_DOTS);
  const overflow = tasks.length - dots.length;

  return (
    <div
      ref={ref}
      className="flex shrink-0 flex-col rounded-row"
      style={{
        width: `${columnWidthPercent}%`,
        backgroundColor: isToday ? "var(--surface)" : GRAY_COLUMN,
        boxShadow: isToday ? "inset 0 0 0 1px var(--border)" : undefined,
      }}
    >
      <div
        ref={setNodeRef}
        className={`rounded-t-row px-2 py-2 text-center ${
          isOver ? "outline-dashed outline-1 outline-[var(--accent)]" : ""
        }`}
      >
        <p
          className={`text-caption uppercase tracking-wide ${
            isToday ? "text-ink-muted" : "text-ink-faint"
          }`}
        >
          {label}
        </p>
        <p className={isToday ? "text-body font-medium text-ink" : "text-meta text-ink-muted"}>
          {headerDate}
          {isToday ? <span className="text-ink-faint"> · today</span> : null}
        </p>
        {tasks.length > 0 ? (
          <div
            className="mt-1.5 flex items-center justify-center gap-1"
            aria-label={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
          >
            {dots.map((task) => {
              const resolved = task.category && !task.categoryUnresolved ? task.category : null;
              return (
                <span
                  key={task.id}
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: resolved ? categorySolidVar(resolved) : NEUTRAL_DOT }}
                />
              );
            })}
            {overflow > 0 ? <span className="text-caption text-ink-faint">+{overflow}</span> : null}
          </div>
        ) : null}
      </div>
      <ul className="mt-1 flex-1 space-y-1.5 px-1 pb-2" aria-label={`Tasks for ${isoDate}`}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            showProject={false}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
});
