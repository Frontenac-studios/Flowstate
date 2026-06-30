"use client";

import { useState } from "react";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";

type Props = {
  tasks: PlanTaskRow[];
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

/**
 * The "Later" backlog: someday work scheduled beyond this week. Collapsible and
 * collapsed by default so it sits quietly under the inbox rail without crowding
 * the week grid.
 */
export function WeekLaterBacklog({ tasks, onComplete, onDelete }: Props) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <section
      className="mt-3 rounded-card border border-subtle bg-surface"
      aria-label="Later backlog"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-caption uppercase tracking-wide text-ink-muted">
          Later · {tasks.length} someday
        </span>
        <span className="text-meta text-ink-faint">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <ul className="space-y-1.5 px-3 pb-3" aria-label="Later tasks">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
