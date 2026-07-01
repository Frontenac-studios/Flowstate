"use client";

import { useDroppable } from "@dnd-kit/core";
import { useState, type ReactNode } from "react";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";

type Props = {
  tasks: PlanTaskRow[];
  heightPx: number;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onDraftClick: () => void;
  appliedMessage: string | null;
  draftPanel: ReactNode;
};

export function WeekInbox({
  tasks,
  heightPx,
  onComplete,
  onDelete,
  onDraftClick,
  appliedMessage,
  draftPanel,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: "week-inbox" });

  const showTasks = !collapsed;

  return (
    <section
      className="mt-4 flex flex-col rounded-card border border-subtle bg-surface p-4"
      style={{ height: showTasks ? heightPx : undefined }}
      aria-label="Plan tasks"
    >
      <div
        ref={setNodeRef}
        className={`mb-2 flex shrink-0 items-start justify-between gap-3 rounded-[var(--radius-card)] ${
          isOver ? "shadow-[inset_0_0_0_2px_var(--accent-soft)]" : ""
        }`}
        onDoubleClick={() => setCollapsed((value) => !value)}
        role="button"
        tabIndex={0}
        aria-expanded={showTasks}
        title="Double-click to collapse or expand"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((value) => !value);
          }
        }}
      >
        <div className="min-w-0 cursor-default select-none">
          <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">Plan Tasks</p>
          <p className="text-xs text-ink-muted">{tasks.length} unscheduled</p>
        </div>
        <div
          className="flex shrink-0 items-center gap-2"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {appliedMessage ? (
            <span className="text-sm text-accent" role="status">
              {appliedMessage}
            </span>
          ) : null}
          <button
            type="button"
            className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink"
            onClick={onDraftClick}
          >
            Draft my week
          </button>
        </div>
      </div>

      {draftPanel}

      {showTasks ? (
        <div className="min-h-0 flex-1 rounded-[var(--radius-card)]">
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-muted">No unscheduled tasks</p>
          ) : (
            <ul className="h-full space-y-2 overflow-y-auto pb-1">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showProject={false}
                  weekDragLift
                  onComplete={onComplete}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
