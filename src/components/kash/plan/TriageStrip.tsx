"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useImperativeHandle, useRef } from "react";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { useTRPC } from "@/trpc/client";

export type TriageTask = {
  id: string;
  title: string;
  projectSlug: string | null;
  projectName: string | null;
};

export type TriageStripHandle = {
  focusFirst: () => void;
  focusIndex: (index: number) => void;
  getFocusedIndex: () => number;
  getTaskCount: () => number;
  applyAction: (action: TriageAction) => void;
};

export type TriageAction = "today" | "tomorrow" | "later" | "drop";

type Props = {
  tasks: TriageTask[];
  focusedIndex: number;
  onFocusedIndexChange: (index: number) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onActionComplete?: () => void;
};

export const TriageStrip = forwardRef<TriageStripHandle, Props>(function TriageStrip(
  { tasks, focusedIndex, onFocusedIndexChange, onDelete, onActionComplete },
  ref
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);

  const invalidatePlan = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  };

  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({ onSuccess: invalidatePlan })
  );

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({ onSuccess: invalidatePlan })
  );

  const applyAction = (action: TriageAction) => {
    const task = tasks[focusedIndex];
    if (!task) return;

    if (action === "drop") {
      deleteMutation.mutate(
        { id: task.id },
        {
          onSuccess: (data) => {
            onDelete(data.snapshot);
            onActionComplete?.();
          },
        }
      );
      return;
    }

    const bucket = action === "today" ? "today" : action === "tomorrow" ? "tomorrow" : "later";
    moveMutation.mutate({ id: task.id, bucket }, { onSuccess: () => onActionComplete?.() });
  };

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      onFocusedIndexChange(0);
      pillRefs.current[0]?.focus();
    },
    focusIndex: (index: number) => {
      const clamped = Math.max(0, Math.min(index, tasks.length - 1));
      onFocusedIndexChange(clamped);
      pillRefs.current[clamped]?.focus();
    },
    getFocusedIndex: () => focusedIndex,
    getTaskCount: () => tasks.length,
    applyAction,
  }));

  if (tasks.length === 0) return null;

  const count = tasks.length;
  const header =
    count === 1
      ? "1 from yesterday — decide as you plan."
      : `${count} from yesterday — decide as you plan.`;

  return (
    <section
      className="glass-panel mt-4 px-4 py-3"
      data-triage-strip
      aria-labelledby="triage-heading"
    >
      <h2 id="triage-heading" className="mb-3 text-sm font-medium text-kash-ink-muted">
        {header}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            ref={(el) => {
              pillRefs.current[index] = el;
            }}
            tabIndex={focusedIndex === index ? 0 : -1}
            role="group"
            aria-label={task.title}
            onFocus={() => onFocusedIndexChange(index)}
            className={`glass-pill flex min-w-[14rem] shrink-0 flex-col gap-2 px-3 py-2 outline-none transition ${
              focusedIndex === index ? "ring-2 ring-kash-accent" : ""
            }`}
          >
            <p className="truncate text-sm font-medium text-kash-ink">{task.title}</p>
            {task.projectSlug ? (
              <span className="glass-pill w-fit px-2 py-0.5 text-xs text-kash-ink-muted">
                #{task.projectSlug}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["today", "Today", "1"],
                  ["tomorrow", "Tomorrow", "2"],
                  ["later", "Later", "3"],
                  ["drop", "Drop", "4"],
                ] as const
              ).map(([action, label, keyHint]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    onFocusedIndexChange(index);
                    applyAction(action);
                  }}
                  className="glass-pill hover:bg-kash-accent-soft px-2 py-0.5 text-xs text-kash-ink-muted transition hover:text-kash-accent"
                >
                  {label}
                  <span className="ml-1 opacity-60">{keyHint}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});
