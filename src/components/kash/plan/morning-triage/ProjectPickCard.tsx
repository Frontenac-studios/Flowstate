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
  intro: string;
  tasks: TriagePickTask[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddIds: (ids: string[]) => void;
  onDeferIds: (ids: string[]) => void;
  onShowMore?: () => void;
  showMoreLabel?: string;
  showMoreDisabled?: boolean;
  disabled?: boolean;
};

export function ProjectPickCard({
  intro,
  tasks,
  selectedIds,
  onToggle,
  onAddIds,
  onDeferIds,
  onShowMore,
  showMoreLabel = "Show more",
  showMoreDisabled = false,
  disabled = false,
}: Props) {
  const selectedList = tasks.map((task) => task.id).filter((id) => selectedIds.has(id));

  if (tasks.length === 0 && !onShowMore) return null;

  return (
    <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
      <p className="text-body text-ink">{intro}</p>

      {tasks.length > 0 ? (
        <TriageTaskPickList
          tasks={tasks}
          selectedIds={selectedIds}
          onToggle={onToggle}
          disabled={disabled}
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {tasks.length > 0 ? (
          <>
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
            <button
              type="button"
              disabled={disabled || selectedList.length === 0}
              onClick={() => onDeferIds(selectedList)}
              className={TRIAGE_CHIP_SECONDARY}
            >
              Not today
              {selectedList.length > 0 && selectedList.length < tasks.length
                ? ` ${selectedList.length}`
                : ""}
            </button>
          </>
        ) : null}
        {onShowMore ? (
          <button
            type="button"
            disabled={disabled || showMoreDisabled}
            onClick={onShowMore}
            className={TRIAGE_CHIP_MUTED}
          >
            {showMoreLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
