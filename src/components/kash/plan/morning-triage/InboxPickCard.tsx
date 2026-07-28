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
  onAddIds: (ids: string[]) => void;
  onSkip: () => void;
  /** Hover-✓ on a row: the task is already done — complete it in place. */
  onCompleteTask?: (id: string) => void;
  disabled?: boolean;
};

export function InboxPickCard({
  intro,
  tasks,
  onAddIds,
  onSkip,
  onCompleteTask,
  disabled = false,
}: Props) {
  if (tasks.length === 0) return null;

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
      <p className="text-caption text-ink">{intro}</p>

      <TriageTaskPickList tasks={tasks} onComplete={onCompleteTask} disabled={disabled} />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddIds(taskIds)}
          className={TRIAGE_CHIP_PRIMARY}
        >
          Add all to Today
        </button>
        <button type="button" disabled={disabled} onClick={onSkip} className={TRIAGE_CHIP_MUTED}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
