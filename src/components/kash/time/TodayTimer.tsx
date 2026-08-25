"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { ensureNotifyPermission, showNotification } from "@/lib/notify/notify";
import { formatElapsedClock } from "@/lib/time/duration";
import { isLongRunningTimer } from "@/lib/time/timer-thresholds";
import { useTRPC } from "@/trpc/client";

/**
 * The first-class work timer, mounted in the Today header (W2b). Project-first:
 * a project plus an optional description is enough to start — a client call is not
 * a task. Exactly one timer runs at a time (the server stops any prior on start),
 * and elapsed is derived from the start instant, so it survives sleep and reloads.
 *
 * This is the only surface that starts a timer now that Focus is parked. The
 * menu-bar timer and idle detection are v1.1 (Q5 split).
 */
export default function TodayTimer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: running } = useQuery(trpc.timeEntries.getRunning.queryOptions());
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const notificationsEnabled = settings?.notificationsEnabled ?? true;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries(trpc.timeEntries.getRunning.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());
  }, [queryClient, trpc]);

  const startMutation = useMutation(
    trpc.timeEntries.start.mutationOptions({ onSuccess: invalidate })
  );
  const stopMutation = useMutation(
    trpc.timeEntries.stop.mutationOptions({ onSuccess: invalidate })
  );

  const startedAt = running ? new Date(running.startedAt) : null;
  const elapsed = useElapsedSeconds(startedAt);
  const isLong = running != null && isLongRunningTimer(elapsed);

  // Timer-running-long alert (W2d): the forgot-to-stop error silently corrupts
  // every downstream number, so it earns an OS notification — fired once per entry,
  // switchable via the master Notifications setting. The chip also turns critical
  // in-app, so the signal survives even where OS notifications can't fire.
  const notifiedEntryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!running || !isLong || !notificationsEnabled) return;
    if (notifiedEntryRef.current === running.entryId) return;
    notifiedEntryRef.current = running.entryId;
    showNotification({
      title: "Timer still running",
      body: `${running.projectName} — ${formatElapsedClock(elapsed)}. Did you forget to stop it?`,
      tag: `long-timer-${running.entryId}`,
    });
  }, [running, isLong, notificationsEnabled, elapsed]);

  if (running) {
    return (
      <div
        className={`flex items-center gap-2 rounded-pill border px-3 py-1 text-xs text-ink ${
          isLong ? "bg-critical/5 border-critical" : "border-subtle bg-surface"
        }`}
        title={
          isLong
            ? "This timer has been running a long time — did you forget to stop it?"
            : undefined
        }
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current text-critical" aria-hidden />
        <span className="max-w-[11rem] truncate" title={running.projectName}>
          {running.projectName}
        </span>
        <span
          className={`tabular-nums ${isLong ? "font-medium text-critical" : "text-ink-muted"}`}
          aria-label="elapsed"
        >
          {formatElapsedClock(elapsed)}
        </span>
        <button
          type="button"
          onClick={() => stopMutation.mutate(undefined)}
          disabled={stopMutation.isPending}
          className="font-medium text-critical transition hover:opacity-80 disabled:opacity-50"
        >
          Stop
        </button>
      </div>
    );
  }

  return (
    <StartTimerPopover
      pending={startMutation.isPending}
      onStart={(projectId, description) => {
        // Ask once, on a real user gesture, so the long-timer alert can reach the OS.
        void ensureNotifyPermission();
        startMutation.mutate({ projectId, description: description || undefined });
      }}
    />
  );
}

function StartTimerPopover({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: (projectId: string, description: string) => void;
}) {
  const trpc = useTRPC();
  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Most-recently-touched project first; default the select to it.
  const sorted = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [projects]
  );
  const effectiveProjectId = projectId || sorted[0]?.id || "";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const submit = () => {
    if (!effectiveProjectId) return;
    onStart(effectiveProjectId, description.trim());
    setDescription("");
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="rounded-pill border border-subtle bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:text-accent"
      >
        Start timer
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Start a timer"
          className="absolute right-0 z-20 mt-1 flex w-64 flex-col gap-2 rounded-card border border-subtle bg-surface p-3 shadow-surface"
        >
          {sorted.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Create a project first to track time against it.
            </p>
          ) : (
            <>
              <Select
                aria-label="Project"
                value={effectiveProjectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="text-sm"
              >
                {sorted.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on? (optional)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                className="text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={submit}
                disabled={pending || !effectiveProjectId}
                className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
              >
                Start
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
