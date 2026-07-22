"use client";

import {
  TriageTaskPickList,
  type TriagePickTask,
} from "@/components/kash/plan/morning-triage/TriageTaskPickList";
import {
  TRIAGE_CHIP_MUTED,
  TRIAGE_CHIP_PRIMARY,
} from "@/components/kash/plan/morning-triage/triage-pick-styles";

type Props = {
  tasks: TriagePickTask[];
  onKeepIds: (ids: string[]) => void;
  onDropIds: (ids: string[]) => void;
  /** Hover-✓ on a row: the task is already done — complete it in place. */
  onCompleteTask?: (id: string) => void;
  /** e.g. "yesterday" or "the last few days" */
  lookbackLabel: string;
  disabled?: boolean;
};

export function CarryoverTriageCard({
  tasks,
  onKeepIds,
  onDropIds,
  onCompleteTask,
  lookbackLabel,
  disabled = false,
}: Props) {
  if (tasks.length === 0) return null;

  const taskIds = tasks.map((task) => task.id);
  const count = tasks.length;
  const noun = count === 1 ? "task" : "tasks";

  return (
    <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
      <p className="text-body text-ink">
        You have {count} unfinished {noun} from {lookbackLabel}.
      </p>

      <TriageTaskPickList tasks={tasks} onComplete={onCompleteTask} disabled={disabled} />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeepIds(taskIds)}
          className={TRIAGE_CHIP_PRIMARY}
        >
          Keep all
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDropIds(taskIds)}
          className={TRIAGE_CHIP_MUTED}
        >
          Drop all
        </button>
      </div>
    </div>
  );
}
