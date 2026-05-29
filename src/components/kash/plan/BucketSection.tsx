"use client";

import { useEffect, useId, useState } from "react";
import { useDroppable } from "@dnd-kit/core";

import type { Bucket } from "@/lib/tasks/derive-bucket";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "./TaskRow";
import { TaskRow } from "./TaskRow";

type Props = {
  bucket: Exclude<Bucket, "today">;
  label: string;
  tasks: PlanTaskRow[];
  pulse: boolean;
  /** Override droppable id (e.g. bucket:date:2026-05-28 for named-days view). */
  droppableId?: string;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function BucketSection({
  bucket,
  label,
  tasks,
  pulse,
  droppableId,
  onComplete,
  onDelete,
}: Props) {
  const regionId = useId();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (pulse) setCollapsed(false);
  }, [pulse]);

  const { setNodeRef, isOver } = useDroppable({ id: droppableId ?? `bucket:${bucket}` });

  const hasTasks = tasks.length > 0;
  const showBody = !collapsed && hasTasks;

  return (
    <section className={`mt-6 ${pulse ? "kash-section-pulse rounded-[var(--kash-radius)]" : ""}`}>
      <button
        ref={setNodeRef}
        type="button"
        className={`glass-panel-opaque glass-section-header w-full ${
          isOver ? "glass-section-header--drop-target" : ""
        }`}
        aria-expanded={showBody}
        aria-controls={regionId}
        onClick={() => setCollapsed((v) => !v)}
      >
        <svg
          className={`h-3.5 w-3.5 text-kash-ink-muted transition-transform duration-150 motion-reduce:transition-none ${
            showBody ? "rotate-90" : ""
          }`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4.5 3l3 3-3 3" />
        </svg>
        <span className="text-sm font-medium uppercase tracking-wide text-kash-ink-muted">
          {label}
        </span>
        <span className="ml-auto text-sm text-kash-ink-muted">
          {hasTasks ? `(${tasks.length})` : ""}
        </span>
      </button>

      <div id={regionId} hidden={!showBody} className="mt-3">
        {showBody ? (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
