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
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function BucketSection({ bucket, label, tasks, pulse, onComplete, onDelete }: Props) {
  const regionId = useId();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (pulse) setCollapsed(false);
  }, [pulse]);

  const { setNodeRef, isOver } = useDroppable({ id: `bucket:${bucket}` });

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
        <span className="w-5 text-kash-ink-muted" aria-hidden>
          {showBody ? "▾" : "▸"}
        </span>
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
