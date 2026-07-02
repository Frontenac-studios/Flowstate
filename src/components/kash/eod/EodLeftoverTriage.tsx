"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { addDays, datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import type { HandoffPlanTask } from "@/lib/morning-handoff/handoff-task-filters";
import { filterAssembledTodayList } from "@/lib/morning-handoff/handoff-task-filters";
import { useTRPC } from "@/trpc/client";

type Props = {
  localDate: string;
  tasks: HandoffPlanTask[];
};

export function EodLeftoverTriage({ localDate, tasks }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);

  const leftovers = useMemo(() => filterAssembledTodayList(tasks, localDate), [tasks, localDate]);

  const weekDays = useMemo(() => {
    const ref = startOfLocalDay(new Date(`${localDate}T12:00:00`));
    return datesInIsoWeek(ref).map((date) => toISODateString(date));
  }, [localDate]);

  const tomorrowIso = useMemo(() => {
    const ref = startOfLocalDay(new Date(`${localDate}T12:00:00`));
    return toISODateString(addDays(ref, 1));
  }, [localDate]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
  };

  const scheduleMutation = useMutation(
    trpc.tasks.scheduleToDate.mutationOptions({ onSuccess: invalidate })
  );
  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({ onSuccess: invalidate })
  );
  const dropMutation = useMutation(
    trpc.abyss.dropFromTask.mutationOptions({ onSuccess: invalidate })
  );

  if (leftovers.length === 0) {
    return <p className="text-body text-ink-muted">Nothing left open — a clean close.</p>;
  }

  return (
    <ul className="space-y-[var(--space-3)]">
      {leftovers.map((task) => (
        <li
          key={task.id}
          className="space-y-[var(--space-2)] rounded-row border border-subtle px-[var(--space-3)] py-[var(--space-2)]"
        >
          <p className="break-words text-body text-ink">{task.title}</p>
          {rescheduleTaskId === task.id ? (
            <div className="flex flex-wrap gap-1">
              {weekDays.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink-muted hover:bg-[var(--accent-soft)] hover:text-ink"
                  onClick={() => {
                    scheduleMutation.mutate({ id: task.id, scheduledDate: iso });
                    setRescheduleTaskId(null);
                  }}
                >
                  {iso.slice(5)}
                </button>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="text-caption"
                onClick={() => setRescheduleTaskId(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]"
                onClick={() => setRescheduleTaskId(task.id)}
              >
                Reschedule
              </button>
              <button
                type="button"
                className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]"
                onClick={() => moveMutation.mutate({ id: task.id, bucket: "tomorrow" })}
              >
                Tomorrow
              </button>
              <button
                type="button"
                className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink-muted transition hover:text-ink"
                onClick={() => dropMutation.mutate({ id: task.id })}
              >
                Backlog
              </button>
            </div>
          )}
        </li>
      ))}
      <p className="text-caption text-ink-faint">
        Untouched items roll into tomorrow&apos;s carryover.
      </p>
      <p className="sr-only">Tomorrow is {tomorrowIso}</p>
    </ul>
  );
}
