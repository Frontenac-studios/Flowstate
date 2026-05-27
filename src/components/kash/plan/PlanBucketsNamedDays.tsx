"use client";

import { useMemo } from "react";

import { datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "./TaskRow";
import { BucketSection } from "./BucketSection";

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type NamedDaysBucketedTasks = {
  tomorrow: PlanTaskRow[];
  byWeekdayIso: Record<string, PlanTaskRow[]>;
  later: PlanTaskRow[];
};

type Props = {
  tasks: NamedDaysBucketedTasks;
  pulseTarget: string | null;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

function formatDayLabel(date: Date, weekdayShort: string): string {
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weekdayShort} ${monthDay}`;
}

export function PlanBucketsNamedDays({ tasks, pulseTarget, onComplete, onDelete }: Props) {
  const weekColumns = useMemo(() => {
    const now = new Date();
    const weekDates = datesInIsoWeek(now);
    return weekDates.map((date, i) => ({
      iso: toISODateString(startOfLocalDay(date)),
      label: formatDayLabel(date, WEEKDAY_SHORT[i]!),
      tasks: tasks.byWeekdayIso[toISODateString(startOfLocalDay(date))] ?? [],
    }));
  }, [tasks.byWeekdayIso]);

  return (
    <>
      <BucketSection
        bucket="tomorrow"
        label="Tomorrow"
        tasks={tasks.tomorrow}
        pulse={pulseTarget === "tomorrow"}
        onComplete={onComplete}
        onDelete={onDelete}
      />
      {weekColumns.map((col) => (
        <BucketSection
          key={col.iso}
          bucket="this_week"
          label={col.label}
          tasks={col.tasks}
          pulse={pulseTarget === col.iso}
          droppableId={`bucket:date:${col.iso}`}
          onComplete={onComplete}
          onDelete={onDelete}
        />
      ))}
      <BucketSection
        bucket="later"
        label="Later"
        tasks={tasks.later}
        pulse={pulseTarget === "later"}
        onComplete={onComplete}
        onDelete={onDelete}
      />
    </>
  );
}
