"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Pause, Play, kashIconProps } from "@/components/kash/ui/icon";
import { KeyCap } from "@/components/kash/ui/KeyCap";
import { triggerEphemeralCelebration } from "@/components/kash/mechanics/EphemeralCelebration";
import { useFocusSession } from "@/hooks/useFocusSession";
import { useFocusTimeEntry } from "@/hooks/useFocusTimeEntry";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { setOsDoNotDisturb } from "@/lib/about-me/os-dnd";
import { resolveFocusWorkDurationSeconds } from "@/lib/focus/resolve-focus-duration";
import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { pickRdmTask } from "@/lib/rdm/pick-task";
import { playFocusChime } from "@/lib/sound/play-chime";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { useTRPC } from "@/trpc/client";

import { FocusTimerRing } from "./FocusTimerRing";
import { timeString } from "./timeString";

type ExitReason = "done" | "park" | "esc";

export function FocusCanvas() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const localDate = useLocalCalendarDate();
  const todayIso = localDate;

  const taskId = searchParams.get("taskId");
  const blockId = searchParams.get("blockId");

  const { data: tasks = [], isPending: tasksPending } = useQuery(
    trpc.tasks.listIncomplete.queryOptions()
  );
  const { data: triageTasks = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const { data: blocks = [] } = useQuery(
    trpc.focusBlocks.listForDate.queryOptions({ date: todayIso })
  );

  const block = useMemo(
    () => (blockId ? (blocks.find((b) => b.id === blockId) ?? null) : null),
    [blockId, blocks]
  );

  const triageIds = useMemo(() => new Set(triageTasks.map((t) => t.id)), [triageTasks]);
  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId) ?? null;
  }, [taskId, tasks]);

  const lastWasLargeRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [doneFlash, setDoneFlash] = useState<string | null>(null);
  const [dndApplied, setDndApplied] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  const completeMutation = useMutation(trpc.tasks.complete.mutationOptions());
  const completeBlockMutation = useMutation(trpc.focusBlocks.complete.mutationOptions());

  const resetSessionUi = useCallback(() => {
    setDoneFlash(null);
    setIsPaused(false);
    setSessionElapsedSeconds(0);
  }, []);

  const { mutateAsync: startTimeEntry } = useMutation(trpc.timeEntries.start.mutationOptions());
  const { mutateAsync: endTimeEntry } = useMutation(trpc.timeEntries.end.mutationOptions());

  const entryIdRef = useFocusTimeEntry({
    taskId,
    startTimeEntry,
    onSessionStart: resetSessionUi,
  });

  const startWorkEntry = useCallback(async () => {
    if (!taskId || entryIdRef.current) return;
    const { entryId } = await startTimeEntry({ taskId });
    entryIdRef.current = entryId;
  }, [startTimeEntry, taskId, entryIdRef]);

  const endWorkEntry = useCallback(
    async (reason: ExitReason | "pause") => {
      if (!entryIdRef.current) return;
      const id = entryIdRef.current;
      entryIdRef.current = null;
      await endTimeEntry({ entryId: id, reason });
    },
    [endTimeEntry, entryIdRef]
  );

  const handleWorkSegmentEnd = useCallback(() => {
    playFocusChime({ notificationsEnabled: settings?.notificationsEnabled });
    void endWorkEntry("pause");
    setIsPaused(true);
  }, [endWorkEntry, settings?.notificationsEnabled]);

  const resolvedWorkSeconds = useMemo(() => {
    if (!task) return resolveFocusWorkDurationSeconds({});
    return resolveFocusWorkDurationSeconds({
      blockStartMin: block?.startMin,
      blockEndMin: block?.endMin,
      timeEstimateMinutes: task.timeEstimateMinutes,
    });
  }, [task, block]);

  const {
    phase,
    workTotalSeconds,
    workRemainingSeconds,
    breakTotalSeconds,
    breakRemainingSeconds,
    workElapsedSeconds,
    setWorkDuration,
    setBreakDuration,
    skipBreak,
    continueWork,
    resetForNewTask,
  } = useFocusSession({
    initialWorkSeconds: resolvedWorkSeconds,
    isPaused,
    onWorkSegmentEnd: handleWorkSegmentEnd,
  });

  const lastInitKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!taskId || !task) return;
    const key = `${taskId}:${blockId ?? ""}:${resolvedWorkSeconds}`;
    if (lastInitKeyRef.current === key) return;
    lastInitKeyRef.current = key;
    resetForNewTask(resolvedWorkSeconds);
    resetSessionUi();
  }, [taskId, task, blockId, resolvedWorkSeconds, resetForNewTask, resetSessionUi]);

  useEffect(() => {
    if (!taskId) return;
    const id = window.setInterval(() => setSessionElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [taskId]);

  const handlePause = useCallback(async () => {
    if (doneFlash || isPaused || !taskId || phase !== "work") return;
    setIsPaused(true);
    await endWorkEntry("pause");
  }, [doneFlash, isPaused, taskId, phase, endWorkEntry]);

  const handleResume = useCallback(async () => {
    if (doneFlash || !isPaused || !taskId || phase !== "work") return;
    setIsPaused(false);
    await startWorkEntry();
  }, [doneFlash, isPaused, taskId, phase, startWorkEntry]);

  const handleContinueAfterBreak = useCallback(async () => {
    continueWork();
    setIsPaused(false);
    await startWorkEntry();
  }, [continueWork, startWorkEntry]);

  const rollNext = useCallback(
    async (excludeTaskId?: string) => {
      await queryClient.refetchQueries({
        queryKey: trpc.tasks.listIncomplete.queryKey(),
      });

      const freshTasks = queryClient.getQueryData(trpc.tasks.listIncomplete.queryKey()) ?? tasks;
      const freshExcludingTriage = freshTasks.filter((t) => !triageIds.has(t.id));
      const freshToday = partitionPlanTasks(freshExcludingTriage, new Date()).today;

      const pool = freshToday.filter(
        (t) => t.completedAt === null && (excludeTaskId ? t.id !== excludeTaskId : true)
      );
      const pick = pickRdmTask(pool, { lastWasLarge: lastWasLargeRef.current });
      if (!pick) {
        router.push("/today");
        return;
      }

      lastWasLargeRef.current = pick.isTop3;

      const params = new URLSearchParams({ taskId: pick.id });
      router.replace(`/today/focus?${params.toString()}`);
    },
    [queryClient, router, tasks, triageIds, trpc.tasks.listIncomplete]
  );

  useEffect(() => {
    if (!taskId || settings?.focusDndEnabled === false) {
      setDndApplied(false);
      return;
    }
    let active = true;
    void setOsDoNotDisturb(true).then((applied) => {
      if (active) setDndApplied(applied);
    });
    return () => {
      active = false;
      setDndApplied(false);
      void setOsDoNotDisturb(false);
    };
  }, [taskId, settings?.focusDndEnabled]);

  const dndLabel =
    settings?.focusDndEnabled === false
      ? isPaused
        ? "PAUSED"
        : "FOCUSING"
      : dndApplied
        ? isPaused
          ? "PAUSED · DND ON"
          : "FOCUSING · DND ON"
        : isPaused
          ? "PAUSED"
          : "FOCUSING";

  const handleDone = useCallback(async () => {
    if (!task || doneFlash || exiting) return;

    setExiting(true);
    setExitError(null);
    setDoneFlash(`✓ done in ${Math.max(1, Math.round(workElapsedSeconds / 60))}m`);
    if (workElapsedSeconds >= 60 || blockId) triggerEphemeralCelebration("focus-done");

    try {
      await endWorkEntry("done");
      await completeMutation.mutateAsync({ id: task.id });

      if (blockId) {
        await completeBlockMutation.mutateAsync({ id: blockId });
      }

      await queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      await queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
      await queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
      await queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());

      window.setTimeout(() => void rollNext(task.id), 1000);
    } catch {
      setDoneFlash(null);
      setExiting(false);
      setExitError("Couldn't finish this task. Please try again.");
    }
  }, [
    blockId,
    completeBlockMutation,
    completeMutation,
    doneFlash,
    exiting,
    endWorkEntry,
    queryClient,
    rollNext,
    workElapsedSeconds,
    task,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTop3Slots,
    trpc.planning.getQuarterActivity,
    trpc.planning.getYearActivity,
  ]);

  const handlePark = useCallback(async () => {
    if (doneFlash || exiting) return;
    setExiting(true);
    setExitError(null);
    try {
      await endWorkEntry("park");
      router.push("/today");
    } catch {
      setExiting(false);
      setExitError("Couldn't park the session. Please try again.");
    }
  }, [doneFlash, exiting, endWorkEntry, router]);

  const handleEsc = useCallback(async () => {
    if (doneFlash || exiting) return;
    setExiting(true);
    setExitError(null);
    try {
      await endWorkEntry("esc");
      router.push("/today");
    } catch {
      setExiting(false);
      setExitError("Couldn't exit the session. Please try again.");
    }
  }, [doneFlash, exiting, endWorkEntry, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!taskId) return;
      if (e.key === "Escape") {
        e.preventDefault();
        void handleEsc();
        return;
      }
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault();
        void handleDone();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDone, handleEsc, taskId]);

  if (!taskId) {
    return (
      <FocusEmptyState
        message="No task selected. Returning to your plan."
        onBack={() => router.push("/today")}
      />
    );
  }

  if (tasksPending) {
    return <FocusEmptyState message="Loading…" />;
  }

  if (!task) {
    return (
      <FocusEmptyState
        message="Task not found. Returning to your plan."
        onBack={() => router.push("/today")}
      />
    );
  }

  const showCategory = !task.categoryUnresolved;
  const workDurationEditable =
    phase === "work" && (isPaused || workRemainingSeconds === workTotalSeconds);

  return (
    <div key={taskId} className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="row-arrive flex min-h-0 flex-1 flex-col p-8 lg:p-12">
        <span className="text-caption text-ink-faint">Focus session</span>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="h-4 w-[var(--stripe-width)] shrink-0 rounded-full"
            style={{
              backgroundColor: showCategory ? categorySolidVar(task.category) : "var(--ink-faint)",
            }}
            aria-hidden
          />
          {showCategory ? (
            <span
              className="rounded-chip px-2 py-0.5 text-caption"
              style={{
                backgroundColor: categoryFillVar(task.category),
                color: categoryTextVar(task.category),
              }}
            >
              {categorySeedLabel(task.category)}
            </span>
          ) : null}
          {task.isTop3 ? (
            <span
              className="rounded-chip border border-subtle px-2 py-0.5 text-caption text-ink"
              aria-label="Top 3"
            >
              ★ Top 3
            </span>
          ) : null}
        </div>

        <h1 className="mt-4 text-2xl font-medium leading-snug text-ink lg:text-3xl">
          {task.title}
        </h1>

        {task.projectSlug ? (
          <div className="mt-3 text-meta text-ink-muted">
            {task.projectId ? (
              <Link href={`/projects/${task.projectId}`} className="transition hover:text-ink">
                #{task.projectSlug}
              </Link>
            ) : (
              <span>#{task.projectSlug}</span>
            )}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
          <button
            type="button"
            onClick={() => void handleDone()}
            className="inline-flex items-center gap-2 rounded-control border-emphasis border-ink px-5 py-2 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
            disabled={doneFlash !== null || exiting}
          >
            Done
            <KeyCap>⌘↵</KeyCap>
          </button>
          <button
            type="button"
            onClick={() => void handlePark()}
            className="rounded-control border-emphasis border-subtle px-5 py-2 text-sm font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
            disabled={doneFlash !== null || exiting}
          >
            Park
          </button>
        </div>
        {exitError ? (
          <p className="mt-3 text-sm text-critical" role="alert">
            {exitError}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-5 border-t border-subtle bg-surface-2 p-8 lg:min-h-0 lg:w-[42%] lg:border-l lg:border-t-0">
        {phase === "work" ? (
          <>
            <FocusTimerRing
              remainingSeconds={workRemainingSeconds}
              totalSeconds={workTotalSeconds}
              onDurationCommit={setWorkDuration}
              label={dndLabel}
              elapsedWorkSeconds={workElapsedSeconds}
              showElapsed
              durationEditable={workDurationEditable}
            />
            <button
              type="button"
              onClick={() => void (isPaused ? handleResume() : handlePause())}
              disabled={doneFlash !== null}
              aria-label={isPaused ? "Resume" : "Pause"}
              className="focus-visible:text-on-accent flex h-11 w-11 items-center justify-center rounded-full border-emphasis border-ink text-ink transition hover:bg-[var(--accent-soft)] focus:outline-none focus-visible:bg-ink disabled:opacity-50"
            >
              {isPaused ? (
                <Play {...kashIconProps({ tokenSize: "md", fill: "currentColor" })} aria-hidden />
              ) : (
                <Pause {...kashIconProps({ tokenSize: "md", fill: "currentColor" })} aria-hidden />
              )}
            </button>
          </>
        ) : null}

        {phase === "break" ? (
          <>
            <FocusTimerRing
              remainingSeconds={breakRemainingSeconds}
              totalSeconds={breakTotalSeconds}
              onDurationCommit={setBreakDuration}
              label="BREAK · Take a break"
              durationEditable
            />
            <p className="max-w-xs text-center text-caption text-ink-muted">
              Session {timeString(sessionElapsedSeconds)} — work time pauses during breaks.
            </p>
            <button
              type="button"
              onClick={skipBreak}
              className="rounded-control border-emphasis border-subtle px-5 py-2 text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              Skip break
            </button>
          </>
        ) : null}

        {phase === "postBreak" ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-subtitle font-medium text-ink">Ready for another block?</p>
            <p className="text-caption text-ink-muted">
              {Math.max(1, Math.round(workElapsedSeconds / 60))} min worked · session{" "}
              {timeString(sessionElapsedSeconds)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleContinueAfterBreak()}
                className="rounded-control border-emphasis border-ink px-5 py-2 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)]"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => void handleDone()}
                className="rounded-control border-emphasis border-subtle px-5 py-2 text-sm font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
                disabled={doneFlash !== null || exiting}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => void handlePark()}
                className="rounded-control border-emphasis border-subtle px-5 py-2 text-sm font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
                disabled={doneFlash !== null || exiting}
              >
                Park
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {doneFlash ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-sticky text-center text-lg text-ink">
          {doneFlash}
        </div>
      ) : null}
    </div>
  );
}

function FocusEmptyState({ message, onBack }: { message: string; onBack?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-subtitle font-medium text-ink">Focus mode</h2>
      <p className="text-ink-muted">{message}</p>
      {onBack ? (
        <button
          type="button"
          className="rounded-chip px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
          onClick={onBack}
        >
          Back to plan
        </button>
      ) : null}
    </div>
  );
}
