"use client";

import { useDroppable } from "@dnd-kit/core";
import { forwardRef, useState, type MutableRefObject, type Ref } from "react";

import { formatHeaderDate, parseISODateString } from "@/lib/dates/local-day";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { hasSeenWeekPinHint, markWeekPinHintSeen } from "@/lib/week/week-pin-hint-storage";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";
import AddProtectedBlockButton from "./AddProtectedBlockButton";
import { ColumnCategoryStrip } from "./ColumnCategoryStrip";
import ColumnTallyPopover from "./ColumnTallyPopover";
import DayPrioritiesSlots, { type DayPrioritySlotTask } from "./DayPrioritiesSlots";
import ProtectedBlockChip, { type ProtectedBlockRow } from "./ProtectedBlockChip";
import { ExternalEventWeekChip } from "../ExternalEventBlock";

import type { OverCommitThresholdMode } from "@/lib/week/over-commit-threshold";
import type { EventForDay } from "@/trpc/routers/calendar";

type Props = {
  isoDate: string;
  label: string;
  isToday: boolean;
  tasks: PlanTaskRow[];
  pinnedBySlot: Map<number, DayPrioritySlotTask>;
  protectedBlocks: ProtectedBlockRow[];
  externalEvents?: EventForDay[];
  meetingSummary?: string | null;
  hasCalendarData?: boolean;
  overCommitted?: boolean;
  overCommitMode?: OverCommitThresholdMode;
  showPinHint?: boolean;
  /** Execution week surface: column fills grid height and tasks scroll internally. */
  fillHeight?: boolean;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onRemoveProtected: (id: string) => void;
  onPinTask: (taskId: string, sourceEl: HTMLElement) => void;
  onUnpinPriority: (taskId: string) => void;
  canPinMore: boolean;
};

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

/** D40 (reverses D19) — Jun-24 inverted emphasis: soft-gray day columns, today the lone white column + white date pill. Contrast carries the signal, not an ink border. */
export const WeekColumn = forwardRef<HTMLDivElement, Props>(function WeekColumn(
  {
    isoDate,
    label,
    isToday,
    tasks,
    pinnedBySlot,
    protectedBlocks,
    externalEvents = [],
    meetingSummary = null,
    hasCalendarData = false,
    overCommitted = false,
    overCommitMode = "cold-start",
    showPinHint = false,
    fillHeight = false,
    onComplete,
    onDelete,
    onRemoveProtected,
    onPinTask,
    onUnpinPriority,
    canPinMore,
  },
  ref
) {
  const { setNodeRef, isOver } = useDroppable({ id: `week-day:${isoDate}` });
  const headerDate = formatHeaderDate(parseISODateString(isoDate));
  const [pinHintDismissed, setPinHintDismissed] = useState(() => hasSeenWeekPinHint());

  const priorityTaskIds = new Set(Array.from(pinnedBySlot.values()).map((task) => task.id));
  const regularTasks = tasks.filter((task) => !priorityTaskIds.has(task.id));

  const dismissPinHint = () => {
    markWeekPinHintSeen();
    setPinHintDismissed(true);
  };

  return (
    <div
      ref={mergeRefs(ref, setNodeRef)}
      className={`group/column flex min-w-0 flex-col rounded-card border border-subtle shadow-surface ${
        fillHeight ? "h-full max-h-full overflow-hidden" : ""
      } ${isToday ? "bg-surface" : "bg-active-surface"} ${
        isOver ? "outline-dashed outline-1 outline-[var(--accent)]" : ""
      }`}
    >
      <ColumnTallyPopover
        label={label}
        headerDate={headerDate}
        isToday={isToday}
        tasks={tasks}
        overCommitted={overCommitted}
        overCommitMode={overCommitMode}
        categoryStrip={<ColumnCategoryStrip tasks={tasks} />}
        meetingSummary={meetingSummary}
        hasCalendarData={hasCalendarData}
      />

      {protectedBlocks.length > 0 || externalEvents.length > 0 ? (
        <ul
          className="mt-1 shrink-0 space-y-1 px-1"
          aria-label={`Calendar and protected time for ${isoDate}`}
        >
          {protectedBlocks.map((block) => (
            <ProtectedBlockChip
              key={block.id}
              block={block}
              compact
              animatePlace
              onRemove={onRemoveProtected}
            />
          ))}
          {externalEvents.map((event) => (
            <ExternalEventWeekChip key={event.id} event={event} />
          ))}
        </ul>
      ) : null}

      <DayPrioritiesSlots
        pinnedBySlot={pinnedBySlot}
        onUnpin={onUnpinPriority}
        showPinHint={showPinHint && !pinHintDismissed}
        onDismissPinHint={dismissPinHint}
      />

      <ul
        className={`mt-1 space-y-1.5 px-1 pb-2 ${
          fillHeight ? "week-column-tasks min-h-0 flex-1 overflow-y-auto" : "flex-1"
        }`}
        aria-label={`Tasks for ${isoDate}`}
      >
        {regularTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            weekDragLift
            canPin={canPinMore}
            onPin={onPinTask}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
      </ul>

      <div className="shrink-0 px-1 pb-2 [@media(hover:hover)]:invisible [@media(hover:hover)]:group-hover/column:visible">
        <AddProtectedBlockButton isoDate={isoDate} />
      </div>
    </div>
  );
});
