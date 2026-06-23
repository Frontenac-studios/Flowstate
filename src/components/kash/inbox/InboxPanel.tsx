"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { useSessionUndo } from "@/hooks/useSessionUndo";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { PROJECT_CATEGORY_META } from "@/lib/projects/categories";
import { phaseRampColor } from "@/lib/projects/project-phase-color";
import { useTRPC } from "@/trpc/client";

import { useReveal } from "../plan/LensProvider";

type InboxAction = "today" | "tomorrow" | "later" | "drop";

const NEUTRAL_CATEGORY_STRIPE = "rgba(120,120,120,0.3)";

const ACTIONS: ReadonlyArray<readonly [InboxAction, string, string]> = [
  ["today", "Today", "1"],
  ["tomorrow", "Tomorrow", "2"],
  ["later", "Later", "3"],
  ["drop", "Drop", "4"],
];

/**
 * Triage inbox: overdue + unscheduled tasks. Self-contained (its own query +
 * mutations) so it can live in the global bottom dock rather than the day canvas.
 * When `active` (the dock's Inbox tab is showing), arrow keys move the selection
 * and 1–4 apply an action to the selected task.
 */
export function InboxPanel({ active }: { active: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { pushDelete } = useSessionUndo();
  const reveal = useReveal();
  const [selected, setSelected] = useState(0);

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  }, [
    queryClient,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTriageCandidates,
    trpc.tasks.listTop3Slots,
  ]);

  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({ onSuccess: invalidate })
  );
  const deleteMutation = useMutation(trpc.tasks.delete.mutationOptions({ onSuccess: invalidate }));

  const apply = useCallback(
    (index: number, action: InboxAction) => {
      const task = tasks[index];
      if (!task) return;
      if (action === "drop") {
        deleteMutation.mutate({ id: task.id }, { onSuccess: (data) => pushDelete(data.snapshot) });
        return;
      }
      moveMutation.mutate({ id: task.id, bucket: action });
    },
    [tasks, deleteMutation, moveMutation, pushDelete]
  );

  // Keep the selection in range as the list shrinks after each action.
  useEffect(() => {
    setSelected((s) => (s >= tasks.length ? Math.max(0, tasks.length - 1) : s));
  }, [tasks.length]);

  useEffect(() => {
    if (!active || tasks.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(tasks.length - 1, s + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
        return;
      }
      const match = ACTIONS.find(([, , key]) => key === e.key);
      if (match) {
        e.preventDefault();
        setSelected((s) => {
          apply(s, match[0]);
          return s;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, tasks.length, apply]);

  if (isLoading) {
    return <p className="px-1 py-6 text-center text-sm text-kash-ink-muted">Loading…</p>;
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-8 text-center">
        <p className="text-sm text-kash-ink">Inbox zero.</p>
        <p className="text-xs text-kash-ink-muted">Nothing overdue or unscheduled to triage.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5" role="listbox" aria-label="Triage inbox">
      {tasks.map((task, index) => {
        const resolvedCategory = task.category && !task.categoryUnresolved ? task.category : null;
        const stripeColor = resolvedCategory
          ? PROJECT_CATEGORY_META[resolvedCategory].color
          : NEUTRAL_CATEGORY_STRIPE;
        return (
          <li
            key={task.id}
            role="option"
            aria-selected={index === selected}
            onMouseEnter={() => setSelected(index)}
            className={`glass-pill flex items-center gap-2 px-3 py-kash-task-y transition ${
              index === selected ? "ring-2 ring-kash-accent" : ""
            }`}
          >
            {reveal.category ? (
              <span
                className="w-[3px] shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: stripeColor }}
                aria-hidden
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-kash-ink">
              {task.title}
            </span>
            {reveal.project && task.projectName ? (
              <span className="flex max-w-[10rem] shrink-0 items-center gap-1.5 text-xs text-kash-ink-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: phaseRampColor(task.projectId, task.phaseSortOrder) }}
                  aria-hidden
                />
                <span className="truncate">
                  {task.projectName}
                  {task.phaseName ? ` · ${task.phaseName}` : ""}
                </span>
              </span>
            ) : null}
            <div className="flex shrink-0 gap-1">
              {ACTIONS.map(([action, label, key]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => apply(index, action)}
                  className="glass-pill px-2 py-0.5 text-xs text-kash-ink-muted transition hover:bg-[var(--kash-accent-soft)] hover:text-kash-accent"
                >
                  {label}
                  <span className="ml-1 opacity-60">{key}</span>
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
