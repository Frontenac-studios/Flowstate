"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/animate/motion-tokens";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";

type Props = {
  tasks: PlanTaskRow[];
  heightPx: number;
  /** Start collapsed while empty and auto-expand once tasks arrive (execution surface). */
  collapseWhenEmpty?: boolean;
  /** Chat-created task ids to pulse + scroll into view (post-create feedback, P6). */
  highlightTaskIds?: Set<string>;
  /** Force the inbox open (overrides the collapse-while-empty policy). */
  forceExpanded?: boolean;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onDraftClick: () => void;
  appliedMessage: string | null;
  draftPanel: ReactNode;
};

export function WeekInbox({
  tasks,
  heightPx,
  collapseWhenEmpty = false,
  highlightTaskIds,
  forceExpanded = false,
  onComplete,
  onDelete,
  onDraftClick,
  appliedMessage,
  draftPanel,
}: Props) {
  // null = follow the auto policy (collapsed while empty); a boolean is an
  // explicit user override from the double-click/keyboard toggle.
  const [override, setOverride] = useState<boolean | null>(null);
  const { setNodeRef, isOver } = useDroppable({ id: "week-inbox" });
  const firstHighlightedRef = useRef<HTMLLIElement | null>(null);

  const autoCollapsed = collapseWhenEmpty && tasks.length === 0;
  // A forced expand (a chat-created task just landed here) wins over both the
  // auto policy and any prior user collapse for the duration of the signal.
  const collapsed = forceExpanded ? false : (override ?? autoCollapsed);
  const toggleCollapsed = () => setOverride(!collapsed);

  const firstHighlightedId = useMemo(() => {
    if (!highlightTaskIds || highlightTaskIds.size === 0) return null;
    return tasks.find((task) => highlightTaskIds.has(task.id))?.id ?? null;
  }, [tasks, highlightTaskIds]);

  const highlightKey = highlightTaskIds ? Array.from(highlightTaskIds).sort().join(",") : "";

  useEffect(() => {
    const el = firstHighlightedRef.current;
    if (!el) return;
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }, [highlightKey]);

  const showTasks = !collapsed;

  return (
    <section
      ref={setNodeRef}
      className={`mt-4 flex flex-col rounded-card border border-subtle bg-surface p-4 shadow-surface ${
        isOver ? "shadow-[inset_0_0_0_2px_var(--accent-soft)]" : ""
      }`}
      style={{ height: showTasks ? heightPx : undefined }}
      aria-label="Plan tasks"
    >
      <div
        className="mb-2 flex shrink-0 items-start justify-between gap-3 rounded-[var(--radius-card)]"
        onDoubleClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        aria-expanded={showTasks}
        title="Double-click to collapse or expand"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleCollapsed();
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
              {tasks.map((task) => {
                const highlighted = highlightTaskIds?.has(task.id) ?? false;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    showProject={false}
                    weekDragLift
                    showSuggestedDate
                    onComplete={onComplete}
                    onDelete={onDelete}
                    highlightClassName={highlighted ? "kash-section-pulse" : undefined}
                    highlightRef={task.id === firstHighlightedId ? firstHighlightedRef : undefined}
                  />
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
