"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FocusChat } from "@/components/kash/chat/FocusChat";
import { TypedNarration } from "@/components/kash/chat/TypedNarration";
import { useRdmNarration } from "@/hooks/useRdmNarration";
import { pickRdmTask } from "@/lib/rdm/pick-task";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { useTRPC } from "@/trpc/client";

import { timeString } from "./timeString";

type ExitReason = "done" | "park" | "esc";

function priorityDots(priority: number) {
  if (priority <= 0) return null;
  return (
    <span className="text-kash-accent" aria-label={`Priority ${priority}`}>
      {"!".repeat(priority)}
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

  const triageIds = useMemo(() => new Set(triageTasks.map((t) => t.id)), [triageTasks]);
  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId) ?? null;
  }, [taskId, tasks]);

  const entryIdRef = useRef<string | null>(null);
  const lastWasLargeRef = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const [doneFlash, setDoneFlash] = useState<string | null>(null);

  const startMutation = useMutation(trpc.timeEntries.start.mutationOptions());
  const endMutation = useMutation(trpc.timeEntries.end.mutationOptions());
  const completeMutation = useMutation(trpc.tasks.complete.mutationOptions());
  const completeBlockMutation = useMutation(trpc.focusBlocks.complete.mutationOptions());

  const endSession = useCallback(
    async (reason: ExitReason) => {
      if (!entryIdRef.current) return;
      await endMutation.mutateAsync({ entryId: entryIdRef.current, reason });
      entryIdRef.current = null;
    },
    [endMutation]
  );

  const { narration, loading: narrationLoading } = useRdmNarration(
    task
      ? {
          id: task.id,
          title: task.title,
          isTop3: task.isTop3,
          priority: task.priority,
          projectSlug: task.projectSlug,
        }
      : null
  );

  // Start a fresh time entry + timer whenever we land on a new task.
  useEffect(() => {
    if (!taskId) return;
    setSeconds(0);
    setDoneFlash(null);
    entryIdRef.current = null;

    const start = async () => {
      const { entryId } = await startMutation.mutateAsync({ taskId });
      entryIdRef.current = entryId;
    };

    void start();
  }, [taskId, startMutation]);

  useEffect(() => {
    if (!taskId) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [taskId]);

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
        router.push("/plan");
        return;
      }

      lastWasLargeRef.current = pick.isTop3;

      const params = new URLSearchParams({ taskId: pick.id });
      router.replace(`/plan/focus?${params.toString()}`);
    },
    [queryClient, router, tasks, triageIds, trpc.tasks.listIncomplete]
  );

  const handleDone = useCallback(async () => {
    if (!task || doneFlash) return;

    setDoneFlash(`✓ done in ${Math.max(1, Math.round(seconds / 60))}m`);

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
  ]);

  const handlePark = useCallback(async () => {
    if (doneFlash) return;
    await endSession("park");
    router.push("/plan");
  }, [doneFlash, endSession, router]);

  const handleEsc = useCallback(async () => {
    if (doneFlash) return;
    await endSession("esc");
    router.push("/plan");
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
      <section className="glass-panel-opaque p-6 text-center">
        <h2 className="text-lg font-semibold text-kash-ink">Focus mode</h2>
        <p className="mt-2 text-kash-ink-muted">Task not found. Returning to your plan.</p>
        <div className="mt-5">
          <button
            type="button"
            className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
            onClick={() => router.push("/plan")}
          >
            Back to plan
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel-opaque relative mx-auto w-full max-w-xl p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold leading-tight text-kash-ink">{task.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {task.projectSlug ? (
            task.projectId ? (
              <Link
                href={`/projects/${task.projectId}`}
                className="glass-pill px-2 py-0.5 text-xs text-kash-ink-muted hover:text-kash-accent"
              >
                #{task.projectSlug}
              </Link>
            ) : (
              <span className="glass-pill px-2 py-0.5 text-xs text-kash-ink-muted">
                #{task.projectSlug}
              </span>
            )
          ) : null}
          {task.priority > 0 ? priorityDots(task.priority) : null}
          {task.isTop3 ? (
            <span className="glass-pill px-2 py-0.5 text-xs text-kash-accent" aria-label="Top 3">
              ★ Top 3
            </span>
          ) : null}
        </div>
      </div>

      <TypedNarration text={narration} loading={narrationLoading} />

      <FocusChat taskId={task.id} />

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleDone()}
            className="glass-pill px-4 py-2 text-sm font-medium text-kash-ink transition hover:text-kash-accent"
            disabled={doneFlash !== null}
          >
            Done
            <span className="sr-only"> (Cmd+Enter)</span>
          </button>
          <button
            type="button"
            onClick={() => void handlePark()}
            className="glass-pill px-4 py-2 text-sm font-medium text-kash-ink-muted transition hover:text-kash-ink"
            disabled={doneFlash !== null}
          >
            Park
          </button>
        </div>
        <div className="text-right">
          <div className="text-xs text-kash-ink-muted">Time on task</div>
          <div className="mt-1 font-mono text-2xl text-kash-ink">{timeString(seconds)}</div>
        </div>
      </div>

      {doneFlash ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-kash-accent">
          {doneFlash}
        </div>
      ) : null}
    </section>
  );
}
