"use client";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import type { LensGroup } from "@/lib/tasks/lens-apply";

import { TaskRow, type PlanTaskRow } from "./TaskRow";

type Props = {
  group: LensGroup;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

/**
 * A lens sub-group inside a day/bucket section (VF-3 nested grouping): a small
 * colored header for the group + its tasks. Lighter than `BucketSection` — it
 * lives within an already-open section, so it doesn't collapse.
 */
export function LensGroupSection({ group, onComplete, onDelete }: Props) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: group.color }}
        />
        <span className="text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
          {group.label}
        </span>
        <span className="text-xs text-kash-ink-muted">({group.tasks.length})</span>
      </div>
      <ul className="space-y-2">
        {group.tasks.map((task: PlanTaskRow) => (
          <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
