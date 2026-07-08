"use client";

import { useDroppable } from "@dnd-kit/core";
import { forwardRef, useState } from "react";

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

import type { OverCommitThresholdMode } from "@/lib/week/over-commit-threshold";

type Props = {
  isoDate: string;
  label: string;
  isToday: boolean;
  tasks: PlanTaskRow[];
  pinnedBySlot: Map<number, DayPrioritySlotTask>;
  protectedBlocks: ProtectedBlockRow[];
  overCommitted?: boolean;
  overCommitMode?: OverCommitThresholdMode;
  showPinHint?: boolean;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onRemoveProtected: (id: string) => void;
  onPinTask: (taskId: string, sourceEl: HTMLElement) => void;
  onUnpinPriority: (taskId: string) => void;
  canPinMore: boolean;
};

/** D40 (reverses D19) — Jun-24 inverted emphasis: soft-gray day columns, today the lone white column + white date pill. Contrast carries the signal, not an ink border. */
export const WeekColumn = forwardRef<HTMLDivElement, Props>(function WeekColumn(
  {
    isoDate,
    label,
    isToday,
    tasks,
    pinnedBySlot,
    protectedBlocks,
    overCommitted = false,
    overCommitMode = "cold-start",
    showPinHint = false,
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
      ref={ref}
      className={`group/column flex min-w-0 flex-col rounded-card border border-subtle shadow-surface ${
        isToday ? "bg-surface" : "bg-active-surface"
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
        droppableRef={setNodeRef}
        isDropOver={isOver}
      >
        {protectedBlocks.length > 0 ? (
          <ul className="mt-1 space-y-1 px-1" aria-label={`Protected time for ${isoDate}`}>
            {protectedBlocks.map((block) => (
              <ProtectedBlockChip
                key={block.id}
                block={block}
                compact
                animatePlace
                onRemove={onRemoveProtected}
              />
            ))}
          </ul>
        ) : null}
        <DayPrioritiesSlots
          pinnedBySlot={pinnedBySlot}
          onUnpin={onUnpinPriority}
          showPinHint={showPinHint && !pinHintDismissed}
          onDismissPinHint={dismissPinHint}
        />
        <ul className="mt-1 flex-1 space-y-1.5 px-1 pb-2" aria-label={`Tasks for ${isoDate}`}>
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
        <div className="px-1 pb-2 [@media(hover:hover)]:invisible [@media(hover:hover)]:group-hover/column:visible">
          <AddProtectedBlockButton isoDate={isoDate} />
        </div>
      </ColumnTallyPopover>
    </div>
  );
});
