"use client";

import { useEffect, useId, useState } from "react";
import { useDroppable } from "@dnd-kit/core";

import { ChevronRight, kashIconProps } from "@/components/kash/ui/icon";

import type { Bucket } from "@/lib/tasks/derive-bucket";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { applyLens } from "@/lib/tasks/lens-apply";

import { useLens } from "./LensProvider";
import { LensGroupSection } from "./LensGroupSection";
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

  // VF-3: on This Week, filter + (optionally) group tasks within each day/bucket
  // — the day-groups stay as the outer level and lens groups nest inside. Today
  // (and any non-lens scope) renders the plain list unchanged.
  const lens = useLens();
  const result =
    lens?.scope === "this-week" ? applyLens(tasks, lens.state, new Date(), lens.tagFilter) : null;
  const visibleCount =
    result == null
      ? tasks.length
      : result.kind === "grouped"
        ? result.groups.reduce((sum, g) => sum + g.tasks.length, 0)
        : result.tasks.length;

  const hasTasks = visibleCount > 0;
  const showBody = !collapsed && hasTasks;

  return (
    <section
      className={`mt-section ${pulse ? "kash-section-pulse rounded-[var(--radius-card)]" : ""}`}
    >
      <button
        ref={setNodeRef}
        type="button"
        className={`flex min-h-[var(--row-min-height)] w-full items-center gap-2 rounded-card border border-subtle bg-surface px-3 py-2 focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
          isOver ? "shadow-[inset_0_0_0_2px_var(--accent-soft)]" : ""
        }`}
        aria-expanded={showBody}
        aria-controls={regionId}
        onClick={() => setCollapsed((v) => !v)}
      >
        <ChevronRight
          {...kashIconProps({
            tokenSize: "sm",
            className: `text-ink-muted transition-transform duration-150 motion-reduce:transition-none ${
              showBody ? "rotate-90" : ""
            }`,
          })}
          aria-hidden
        />
        <span className="text-sm font-medium uppercase tracking-wide text-ink-muted">{label}</span>
        <span className="ml-auto text-sm text-ink-muted">
          {hasTasks ? `(${visibleCount})` : ""}
        </span>
      </button>

      <div id={regionId} hidden={!showBody} className="mt-3">
        {showBody ? (
          result?.kind === "grouped" ? (
            <div>
              {result.groups.map((group) => (
                <LensGroupSection
                  key={group.key}
                  group={group}
                  onComplete={onComplete}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {(result?.kind === "flat" ? result.tasks : tasks).map((task) => (
                <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
              ))}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
}
