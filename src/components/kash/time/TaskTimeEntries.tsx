"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import Input from "@/components/kash/ui/Input";
import {
  applyClockToDate,
  formatDuration,
  parseClockTime,
  parseDurationToSeconds,
} from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

type Props = {
  taskId: string;
};

function clockLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const REASON_LABEL: Record<string, string> = {
  manual: "manual",
  done: "done",
  park: "parked",
  esc: "stopped",
  pause: "paused",
  start: "running",
};

/**
 * Time-on-task list with manual add / edit / delete (Phase 2.2). Owns its own
 * tRPC queries + mutations so it can drop into any host (Projects task detail,
 * Focus surface) without prop threading. Server-only writes — sync mirrors the
 * rows down for reads, same as the focus timer.
 */
export default function TaskTimeEntries({ taskId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const listKey = trpc.timeEntries.listForTask.queryKey({ taskId });
  const { data: entries = [] } = useQuery(trpc.timeEntries.listForTask.queryOptions({ taskId }));

  const [startInput, setStartInput] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: listKey });

  const createMutation = useMutation(
    trpc.timeEntries.create.mutationOptions({ onSuccess: invalidate })
  );
  const updateMutation = useMutation(
    trpc.timeEntries.update.mutationOptions({ onSuccess: invalidate })
  );
  const deleteMutation = useMutation(
    trpc.timeEntries.delete.mutationOptions({ onSuccess: invalidate })
  );

  const pending = createMutation.isPending || updateMutation.isPending;

  const totalSeconds = useMemo(
    () =>
      entries.reduce((sum, e) => {
        if (!e.endedAt) return sum;
        return sum + Math.max(0, (e.endedAt.getTime() - e.startedAt.getTime()) / 1000);
      }, 0),
    [entries]
  );

  const resetForm = () => {
    setStartInput("");
    setDurationInput("");
    setEditingId(null);
    setError(null);
  };

  const beginEdit = (entry: (typeof entries)[number]) => {
    if (!entry.endedAt) return;
    const seconds = (entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000;
    setEditingId(entry.id);
    setStartInput(clockLabel(entry.startedAt));
    setDurationInput(formatDuration(seconds));
    setError(null);
  };

  const submit = () => {
    const seconds = parseDurationToSeconds(durationInput);
    if (seconds === null) {
      setError('Enter a duration like "20m" or "1h 30m".');
      return;
    }

    const now = new Date();
    let startedAt: Date;
    if (startInput.trim() === "") {
      // No start given: the block ends now and runs back by the duration.
      startedAt = new Date(now.getTime() - seconds * 1000);
    } else {
      const clock = parseClockTime(startInput);
      if (!clock) {
        setError("Enter a start time like 08:00.");
        return;
      }
      startedAt = applyClockToDate(now, clock.hours, clock.minutes);
    }
    const endedAt = new Date(startedAt.getTime() + seconds * 1000);

    const onSettled = { onSuccess: resetForm };
    if (editingId) {
      updateMutation.mutate({ entryId: editingId, startedAt, endedAt }, onSettled);
    } else {
      createMutation.mutate({ taskId, startedAt, endedAt }, onSettled);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">Time</span>
        <span className="text-xs text-ink-muted">{formatDuration(totalSeconds)} total</span>
      </div>

      {entries.length > 0 ? (
        <ul className="flex flex-col">
          {entries.map((entry) => {
            const seconds = entry.endedAt
              ? (entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000
              : 0;
            return (
              <li
                key={entry.id}
                className="flex items-center gap-2 border-b border-[var(--border-subtle)] py-1.5 text-xs text-ink-muted last:border-b-0"
              >
                <span className="flex-1 tabular-nums">
                  {clockLabel(entry.startedAt)}
                  {entry.endedAt ? `–${clockLabel(entry.endedAt)}` : ""}
                  <span className="text-ink-muted/70 ml-1.5">
                    {REASON_LABEL[entry.reason] ?? entry.reason}
                  </span>
                </span>
                <span className="tabular-nums text-ink">{formatDuration(seconds)}</span>
                <button
                  type="button"
                  onClick={() => beginEdit(entry)}
                  className="text-ink-muted transition hover:text-ink"
                  aria-label="Edit entry"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ entryId: entry.id })}
                  disabled={deleteMutation.isPending}
                  className="text-ink-muted transition hover:text-critical disabled:opacity-50"
                  aria-label="Delete entry"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-ink-muted">No time logged yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Input
          type="text"
          inputMode="numeric"
          value={startInput}
          onChange={(e) => setStartInput(e.target.value)}
          placeholder="now"
          aria-label="Start time"
          className="w-16 px-2 py-1 text-xs"
        />
        <span className="text-xs text-ink-muted">+</span>
        <Input
          type="text"
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="20m"
          aria-label="Duration"
          className="w-16 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:text-accent disabled:opacity-50"
        >
          {editingId ? "Save" : "Add time"}
        </button>
        {editingId ? (
          <button
            type="button"
            onClick={resetForm}
            className="text-xs text-ink-muted transition hover:text-ink"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
