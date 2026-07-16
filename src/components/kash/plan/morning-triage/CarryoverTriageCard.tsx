"use client";

import {
  TriageTaskPickList,
  type TriagePickTask,
} from "@/components/kash/plan/morning-triage/TriageTaskPickList";
import {
  TRIAGE_CHIP_MUTED,
  TRIAGE_CHIP_PRIMARY,
  TRIAGE_CHIP_SECONDARY,
} from "@/components/kash/plan/morning-triage/triage-pick-styles";

type Props = {
  tasks: TriagePickTask[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onKeepIds: (ids: string[]) => void;
  onDropIds: (ids: string[]) => void;
  /** e.g. "yesterday" or "the last few days" */
  lookbackLabel: string;
  disabled?: boolean;
};

export function CarryoverTriageCard({
  tasks,
  selectedIds,
  onToggle,
  onKeepIds,
  onDropIds,
  lookbackLabel,
  disabled = false,
}: Props) {
  if (tasks.length === 0) return null;

  const taskIds = tasks.map((task) => task.id);
  const selectedList = taskIds.filter((id) => selectedIds.has(id));
  const count = tasks.length;
  const noun = count === 1 ? "task" : "tasks";

  return (
    <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
      <p className="text-body text-ink">
        You have {count} unfinished {noun} from {lookbackLabel}.
      </p>

      <TriageTaskPickList
        tasks={tasks}
        selectedIds={selectedIds}
        onToggle={onToggle}
        disabled={disabled}
      />

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
        <button
          type="button"
          disabled={disabled || selectedList.length === 0}
          onClick={() => onKeepIds(selectedList)}
          className={TRIAGE_CHIP_SECONDARY}
        >
          Keep selected
          {selectedList.length > 0 && selectedList.length < count ? ` ${selectedList.length}` : ""}
        </button>
        <button
          type="button"
          disabled={disabled || selectedList.length === 0}
          onClick={() => onDropIds(selectedList)}
          className={TRIAGE_CHIP_MUTED}
        >
          Drop selected
          {selectedList.length > 0 && selectedList.length < count ? ` ${selectedList.length}` : ""}
        </button>
      </div>
    </div>
  );
}
