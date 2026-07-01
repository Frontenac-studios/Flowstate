"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Pause, Play, kashIconProps } from "@/components/kash/ui/icon";
import { triggerEphemeralCelebration } from "@/components/kash/mechanics/EphemeralCelebration";
import { useFocusTimeEntry } from "@/hooks/useFocusTimeEntry";
import { setOsDoNotDisturb } from "@/lib/about-me/os-dnd";
import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { pickRdmTask } from "@/lib/rdm/pick-task";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { priorityMeta } from "@/lib/tasks/priority";
import { useTRPC } from "@/trpc/client";

import { timeString } from "./timeString";

type ExitReason = "done" | "park" | "esc";

function priorityDots(priority: number) {
  const meta = priorityMeta(priority);
  if (meta.dots === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Priority ${meta.label}`}>
      {Array.from({ length: meta.dots }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      ))}
    </span>
  );
}

export function FocusCanvas() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const taskId = searchParams.get("taskId");
  const blockId = searchParams.get("blockId");

  const { data: tasks = [] } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: triageTasks = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());

  const triageIds = useMemo(() => new Set(triageTasks.map((t) => t.id)), [triageTasks]);
  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId) ?? null;
  }, [taskId, tasks]);

  const lastWasLargeRef = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [doneFlash, setDoneFlash] = useState<string | null>(null);

  const { mutateAsync: startTimeEntry } = useMutation(trpc.timeEntries.start.mutationOptions());
  const { mutateAsync: endTimeEntry } = useMutation(trpc.timeEntries.end.mutationOptions());
  const completeMutation = useMutation(trpc.tasks.complete.mutationOptions());
  const completeBlockMutation = useMutation(trpc.focusBlocks.complete.mutationOptions());

  const resetSessionUi = useCallback(() => {
    setSeconds(0);
    setDoneFlash(null);
    setIsPaused(false);
  }, []);

  const entryIdRef = useFocusTimeEntry({
    taskId,
    startTimeEntry,
    onSessionStart: resetSessionUi,
  });

  const endSession = useCallback(
    async (reason: ExitReason) => {
      // When paused there is no running entry — the prior segment is already
      // closed, so we just complete the exit without ending anything.
      if (!entryIdRef.current) return;
      await endTimeEntry({ entryId: entryIdRef.current, reason });
      entryIdRef.current = null;
    },
    [endTimeEntry, entryIdRef]
  );

  // The clock only advances while a segment is running.
  useEffect(() => {
    if (!taskId || isPaused) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [taskId, isPaused]);

  const handlePause = useCallback(async () => {
    if (doneFlash || isPaused || !taskId) return;
    setIsPaused(true);
    if (entryIdRef.current) {
      const id = entryIdRef.current;
      entryIdRef.current = null;
      await endTimeEntry({ entryId: id, reason: "pause" });
    }
  }, [doneFlash, isPaused, taskId, endTimeEntry, entryIdRef]);

  const handleResume = useCallback(async () => {
    if (doneFlash || !isPaused || !taskId) return;
    setIsPaused(false);
    const { entryId } = await startTimeEntry({ taskId });
    entryIdRef.current = entryId;
  }, [doneFlash, isPaused, taskId, startTimeEntry, entryIdRef]);

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
    if (!taskId || settings?.focusDndEnabled === false) return;
    setOsDoNotDisturb(true);
    return () => setOsDoNotDisturb(false);
  }, [taskId, settings?.focusDndEnabled]);

  const handleDone = useCallback(async () => {
    if (!task || doneFlash) return;

    setDoneFlash(`✓ done in ${Math.max(1, Math.round(seconds / 60))}m`);
    if (seconds >= 60 || blockId) triggerEphemeralCelebration("focus-done");

    // Finish timing first so the DB records the "session", then complete the task.
    await endSession("done");
    await completeMutation.mutateAsync({ id: task.id });

    // If we came from a timeline block, mark it done (the session above already
    // recorded the actual time — no extra time entry is created here).
    if (blockId) {
      await completeBlockMutation.mutateAsync({ id: blockId });
    }

    await queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    await queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
    await queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
    await queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());

    window.setTimeout(() => void rollNext(task.id), 1000);
  }, [
    blockId,
    completeBlockMutation,
    completeMutation,
    doneFlash,
    endSession,
    queryClient,
    rollNext,
    seconds,
    task,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTop3Slots,
    trpc.planning.getQuarterActivity,
    trpc.planning.getYearActivity,
  ]);

  const handlePark = useCallback(async () => {
    if (doneFlash) return;
    await endSession("park");
    router.push("/today");
  }, [doneFlash, endSession, router]);

  const handleEsc = useCallback(async () => {
    if (doneFlash) return;
    await endSession("esc");
    router.push("/today");
  }, [doneFlash, endSession, router]);

  // Keyboard shortcuts.
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

  if (!taskId || !task) {
    return (
      <section className="rounded-card border border-subtle bg-surface p-6 text-center">
        <h2 className="text-subtitle font-medium text-ink">Focus mode</h2>
        <p className="mt-2 text-ink-muted">Task not found. Returning to your plan.</p>
        <div className="mt-5">
          <button
            type="button"
            className="rounded-chip px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
            onClick={() => router.push("/today")}
          >
            Back to plan
          </button>
        </div>
      </section>
    );
  }

  const showCategory = !task.categoryUnresolved;

  return (
    <section
      key={taskId}
      className="row-arrive relative overflow-hidden rounded-card border border-subtle bg-surface"
    >
      <div className="flex min-h-[440px] flex-col sm:flex-row">
        <div className="flex flex-1 flex-col p-7 sm:p-8">
          <span className="text-caption text-ink-faint">Focus session</span>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className="h-4 w-[var(--stripe-width)] shrink-0 rounded-full"
              style={{
                backgroundColor: showCategory
                  ? categorySolidVar(task.category)
                  : "var(--ink-faint)",
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

          <h1 className="mt-4 text-2xl font-medium leading-snug text-ink">{task.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-meta text-ink-muted">
            {task.projectSlug ? (
              task.projectId ? (
                <Link href={`/projects/${task.projectId}`} className="transition hover:text-ink">
                  #{task.projectSlug}
                </Link>
              ) : (
                <span>#{task.projectSlug}</span>
              )
            ) : null}
            {task.priority > 0 ? priorityDots(task.priority) : null}
          </div>

          <div className="mt-auto flex items-center gap-3 pt-8">
            <button
              type="button"
              onClick={() => void handleDone()}
              className="rounded-control border-[1.5px] border-ink px-5 py-2 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
              disabled={doneFlash !== null}
            >
              Done
              <span className="sr-only"> (Cmd+Enter)</span>
            </button>
            <button
              type="button"
              onClick={() => void handlePark()}
              className="rounded-control border-[1.5px] border-subtle px-5 py-2 text-sm font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
              disabled={doneFlash !== null}
            >
              Park
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-5 border-t border-subtle bg-surface-2 p-8 sm:w-[46%] sm:border-l sm:border-t-0">
          <span className="text-caption tracking-[0.12em] text-ink-faint">
            {isPaused ? "PAUSED" : "FOCUSING · DND ON"}
          </span>
          <div className="font-mono text-6xl font-medium tabular-nums text-ink">
            {timeString(seconds)}
          </div>
          <button
            type="button"
            onClick={() => void (isPaused ? handleResume() : handlePause())}
            disabled={doneFlash !== null}
            aria-label={isPaused ? "Resume" : "Pause"}
            className="focus-visible:text-on-accent flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition hover:bg-[var(--accent-soft)] focus:outline-none focus-visible:bg-ink disabled:opacity-50"
          >
            {isPaused ? (
              <Play {...kashIconProps({ tokenSize: "md", fill: "currentColor" })} aria-hidden />
            ) : (
              <Pause {...kashIconProps({ tokenSize: "md", fill: "currentColor" })} aria-hidden />
            )}
          </button>
          <span className="text-caption text-ink-faint">Esc to exit</span>
        </div>
      </div>

      {doneFlash ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-ink">
          {doneFlash}
        </div>
      ) : null}
    </section>
  );
}
