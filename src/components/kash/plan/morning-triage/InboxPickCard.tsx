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
  intro: string;
  tasks: TriagePickTask[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddIds: (ids: string[]) => void;
  onSkip: () => void;
  disabled?: boolean;
};

export function InboxPickCard({
  intro,
  tasks,
  selectedIds,
  onToggle,
  onAddIds,
  onSkip,
  disabled = false,
}: Props) {
  if (tasks.length === 0) return null;

  const selectedList = tasks.map((task) => task.id).filter((id) => selectedIds.has(id));

  return (
    <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
      <p className="text-body text-ink">{intro}</p>

      <TriageTaskPickList
        tasks={tasks}
        selectedIds={selectedIds}
        onToggle={onToggle}
        disabled={disabled}
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled || selectedList.length === 0}
          onClick={() => onAddIds(selectedList)}
          className={TRIAGE_CHIP_PRIMARY}
        >
          Add selected to Today
          {selectedList.length > 0 && selectedList.length < tasks.length
            ? ` ${selectedList.length}`
            : ""}
        </button>
        <button type="button" disabled={disabled} onClick={onSkip} className={TRIAGE_CHIP_MUTED}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
