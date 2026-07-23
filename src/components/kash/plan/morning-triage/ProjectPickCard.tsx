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
  onAddIds: (ids: string[]) => void;
  onDeferIds: (ids: string[]) => void;
  onShowMore?: () => void;
  showMoreLabel?: string;
  showMoreDisabled?: boolean;
  /** Hover-✓ on a row: the task is already done — complete it in place. */
  onCompleteTask?: (id: string) => void;
  disabled?: boolean;
};

export function ProjectPickCard({
  intro,
  tasks,
  onAddIds,
  onDeferIds,
  onShowMore,
  showMoreLabel = "Show more",
  showMoreDisabled = false,
  onCompleteTask,
  disabled = false,
}: Props) {
  const taskIds = tasks.map((task) => task.id);

  if (tasks.length === 0 && !onShowMore) return null;

  return (
    <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
      <p className="text-caption text-ink">{intro}</p>

      {tasks.length > 0 ? (
        <TriageTaskPickList tasks={tasks} onComplete={onCompleteTask} disabled={disabled} />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {tasks.length > 0 ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAddIds(taskIds)}
              className={TRIAGE_CHIP_PRIMARY}
            >
              Add all to Today
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDeferIds(taskIds)}
              className={TRIAGE_CHIP_SECONDARY}
            >
              Not today
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
