"use client";

import { useDroppable } from "@dnd-kit/core";

import { formatHeaderDate, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "../TaskRow";
import { TaskRow } from "../TaskRow";

type Props = {
  isoDate: string;
  label: string;
  isToday: boolean;
  tasks: PlanTaskRow[];
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function WeekColumn({ isoDate, label, isToday, tasks, onComplete, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `week-day:${isoDate}` });
  const headerDate = formatHeaderDate(parseISODateString(isoDate));
  const todayIso = toISODateString(new Date());

  return (
    <div
      className={`flex min-w-[140px] flex-1 flex-col rounded-[var(--kash-radius)] ${
        isToday ? "border border-kash-accent" : "border border-transparent"
      }`}
    >
      <div
        ref={setNodeRef}
        className={`glass-panel-opaque px-2 py-2 text-center ${
          isOver ? "glass-section-header--drop-target" : ""
        } ${isToday ? "bg-[var(--kash-accent-soft)]/30" : ""}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-kash-ink-muted">{label}</p>
        <p className="text-sm font-medium text-kash-ink">{headerDate}</p>
        {isToday ? (
          <span className="mt-0.5 inline-block text-xs text-kash-accent">Today</span>
        ) : null}
      </div>
      <ul className="mt-2 flex-1 space-y-2 px-1 pb-2" aria-label={`Tasks for ${isoDate}`}>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </ul>
      <span className="sr-only" data-today-marker={isoDate === todayIso ? "true" : undefined} />
    </div>
  );
}
