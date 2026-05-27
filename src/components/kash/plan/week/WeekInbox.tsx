"use client";

import { useDroppable } from "@dnd-kit/core";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";

type Props = {
  tasks: PlanTaskRow[];
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function WeekInbox({ tasks, onComplete, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "week-inbox" });

  return (
    <div className="flex w-60 shrink-0 flex-col">
      <div
        ref={setNodeRef}
        className={`glass-panel-opaque px-3 py-2 ${
          isOver ? "glass-section-header--drop-target" : ""
        }`}
      >
        <p className="text-sm font-medium uppercase tracking-wide text-kash-ink-muted">Inbox</p>
        <p className="text-xs text-kash-ink-muted">{tasks.length} unscheduled</p>
      </div>
      <ul className="mt-2 max-h-[70vh] space-y-2 overflow-y-auto px-1 pb-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
