"use client";

import { useDroppable } from "@dnd-kit/core";
import { forwardRef } from "react";

import { formatHeaderDate, parseISODateString } from "@/lib/dates/local-day";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";
import AddProtectedBlockButton from "./AddProtectedBlockButton";
import ColumnTallyPopover from "./ColumnTallyPopover";
import ProtectedBlockChip, { type ProtectedBlockRow } from "./ProtectedBlockChip";

type Props = {
  isoDate: string;
  label: string;
  isToday: boolean;
  columnWidthPercent: number;
  tasks: PlanTaskRow[];
  protectedBlocks: ProtectedBlockRow[];
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onRemoveProtected: (id: string) => void;
};

/** Inverted "today" emphasis (Kash 3.0): the week is soft-gray, today is white. */
const GRAY_COLUMN = "color-mix(in srgb, var(--ink) 4%, var(--surface))";

export const WeekColumn = forwardRef<HTMLDivElement, Props>(function WeekColumn(
  {
    isoDate,
    label,
    isToday,
    columnWidthPercent,
    tasks,
    protectedBlocks,
    onComplete,
    onDelete,
    onRemoveProtected,
  },
  ref
) {
  const { setNodeRef, isOver } = useDroppable({ id: `week-day:${isoDate}` });
  const headerDate = formatHeaderDate(parseISODateString(isoDate));

  return (
    <div
      ref={ref}
      className="flex shrink-0 flex-col rounded-row"
      style={{
        width: `${columnWidthPercent}%`,
        backgroundColor: isToday ? "var(--surface)" : GRAY_COLUMN,
        boxShadow: isToday ? "inset 0 0 0 1px var(--border)" : undefined,
      }}
    >
      <ColumnTallyPopover
        label={label}
        headerDate={headerDate}
        isToday={isToday}
        tasks={tasks}
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
                onRemove={onRemoveProtected}
              />
            ))}
          </ul>
        ) : null}
        <ul className="mt-1 flex-1 space-y-1.5 px-1 pb-2" aria-label={`Tasks for ${isoDate}`}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              showProject={false}
              suppressDue
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </ul>
        <div className="px-1 pb-2">
          <AddProtectedBlockButton isoDate={isoDate} />
        </div>
      </ColumnTallyPopover>
    </div>
  );
});
