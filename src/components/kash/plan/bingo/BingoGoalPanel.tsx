"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { GoalJourneyTimeline } from "./GoalJourneyTimeline";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { computeGoalCapacity, formatCapacityMinutes } from "@/lib/planning/goal-capacity";
import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  goalId: string;
  locked: boolean;
  onClose: () => void;
};

export default function BingoGoalPanel({ goalId, locked, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const localDate = useLocalCalendarDate();

  const detailQuery = useQuery(trpc.planning.getGoalDetail.queryOptions({ id: goalId }));
  const valuesQuery = useQuery(trpc.aboutMe.values.list.queryOptions());
  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "milestone_breakdown",
      status: "pending",
    })
  );

  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [linkQuery, setLinkQuery] = useState("");
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.planning.getGoalDetail.queryKey({ id: goalId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.planning.listGoals.queryKey() });
  }, [queryClient, trpc, goalId]);

  const createMilestoneMutation = useMutation(
    trpc.planning.createMilestone.mutationOptions({ onSuccess: () => invalidate() })
  );
  const updateGoalMutation = useMutation(
    trpc.planning.updateGoal.mutationOptions({ onSuccess: () => invalidate() })
  );
  const removeMilestoneMutation = useMutation(
    trpc.planning.removeMilestone.mutationOptions({ onSuccess: () => invalidate() })
  );
  const promoteMutation = useMutation(
    trpc.planning.promoteGoalToProject.mutationOptions({ onSuccess: () => invalidate() })
  );
  const pullGoalStepMutation = useMutation(
    trpc.planning.pullGoalStepToToday.mutationOptions({
      onSuccess: () => {
        invalidate();
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      },
    })
  );
  const suggestBreakdownMutation = useMutation(
    trpc.planning.suggestMilestoneBreakdown.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
      },
    })
  );
  const stageSuggestionMutation = useMutation(
    trpc.planning.updateSuggestionStatus.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
      },
    })
  );
  const applySuggestionsMutation = useMutation(
    trpc.planning.applyStagedSuggestions.mutationOptions({
      onSuccess: () => {
        setStagedIds(new Set());
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
        invalidate();
      },
    })
  );
  const createTaskMutation = useMutation(
    trpc.tasks.create.mutationOptions({ onSuccess: () => invalidate() })
  );
  const linkTaskMutation = useMutation(
    trpc.planning.linkTaskToMilestone.mutationOptions({
      onSuccess: () => {
        setLinkQuery("");
        invalidate();
      },
    })
  );

  const detail = detailQuery.data;
  const goal = detail?.goal;
  const category = goal?.category as ProjectCategory | undefined;
  const values = valuesQuery.data ?? [];
  const goalValueId = goal?.valueId ?? null;

  const capacity = useMemo(
    () => computeGoalCapacity(detail?.taskEstimates ?? []),
    [detail?.taskEstimates]
  );

  const milestoneSuggestions = useMemo(() => {
    if (!goal) return [];
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { goalId?: string };
      return payload.goalId === goal.id;
    });
  }, [suggestionsQuery.data, goal]);

  const ghostItems = milestoneSuggestions.map((s) => {
    const payload = s.payload as { title?: string };
    return { id: s.id, label: payload.title ?? "Milestone", detail: undefined };
  });

  const expandedTasksQuery = useQuery({
    ...trpc.planning.listMilestoneTasks.queryOptions({
      milestoneId: expandedMilestoneId ?? "",
    }),
    enabled: !!expandedMilestoneId,
  });

  // Task picker for "link an existing task" — searches incomplete tasks by title,
  // excluding ones already linked to the expanded milestone. Replaces the raw-UUID
  // field so a link can't silently no-op on a mistyped id.
  const incompleteTasksQuery = useQuery({
    ...trpc.tasks.listIncomplete.queryOptions(),
    enabled: !!expandedMilestoneId,
  });
  const linkedTaskIds = useMemo(
    () => new Set((expandedTasksQuery.data ?? []).map((t) => t.id)),
    [expandedTasksQuery.data]
  );
  const linkCandidates = useMemo(() => {
    const q = linkQuery.trim().toLowerCase();
    if (!q) return [];
    return (incompleteTasksQuery.data ?? [])
      .filter((t) => !linkedTaskIds.has(t.id) && t.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [linkQuery, incompleteTasksQuery.data, linkedTaskIds]);

  if (detailQuery.isLoading || !goal || !category) {
    return (
      <div className="rounded-card border border-subtle bg-surface p-4 text-ink-muted shadow-surface">
        Loading goal…
      </div>
    );
  }

  const solid = categorySolidVar(category);

  return (
    <aside
      className="flex flex-col gap-4 rounded-card border border-subtle bg-surface p-4 shadow-surface"
      aria-label={`Goal: ${goal.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-caption font-medium" style={{ color: solid }}>
            {categorySeedLabel(category)}
          </span>
          <h2
            className={`mt-0.5 text-body font-semibold text-ink ${
              goal.state === "done" ? "line-through opacity-70" : ""
            }`}
          >
            {goal.title}
          </h2>
          {locked ? (
            <p className="mt-1 text-caption text-ink-faint">Statement locked after finalize</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-caption text-ink-muted hover:text-ink"
          aria-label="Close goal panel"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 text-caption text-ink-muted">
        <span>
          {detail.milestones.filter((m) => m.isComplete).length} of {detail.milestones.length} stops
        </span>
        <span>·</span>
        <span>{goal.state === "backburnered" ? "Paused" : goal.state}</span>
        {detail.valueLabel ? (
          <>
            <span>·</span>
            <span>{detail.valueLabel}</span>
          </>
        ) : null}
      </div>

      {values.length > 0 && !locked ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-caption font-medium text-ink">Value (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {values.map((v) => {
              const selected = goalValueId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={updateGoalMutation.isPending}
                  onClick={() =>
                    updateGoalMutation.mutate({
                      id: goal.id,
                      valueId: selected ? null : v.id,
                    })
                  }
                  aria-pressed={selected}
                  className={`rounded-chip border px-3 py-1 text-caption font-medium transition disabled:opacity-40 ${
                    selected
                      ? "border-ink bg-ink text-accent-on"
                      : "border-subtle text-ink-muted hover:text-ink"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {capacity.showNudge ? (
        <p className="rounded-control border border-subtle bg-surface-2 px-3 py-2 text-caption text-ink-muted">
          This goal has about {formatCapacityMinutes(capacity.committedMinutes)} of linked work
          planned — that&apos;s {(capacity.ratio * 100).toFixed(0)}% of a typical week. Worth a
          sanity check?
        </p>
      ) : null}

      {goal.projectId && detail.projectSlug ? (
        <Link
          href={`/projects/${detail.projectSlug}`}
          className="text-caption font-medium text-ink underline-offset-2 hover:underline"
        >
          Open project · {detail.projectName}
        </Link>
      ) : (
        <button
          type="button"
          disabled={promoteMutation.isPending || detail.milestones.length === 0}
          onClick={() => promoteMutation.mutate({ goalId: goal.id })}
          className="self-start rounded-control border border-subtle px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
        >
          {promoteMutation.isPending ? "Creating project…" : "Promote to project"}
        </button>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">Journey</h3>
        <GoalJourneyTimeline
          milestones={detail.milestones}
          onWorkTowardToday={() => pullGoalStepMutation.mutate({ goalId: goal.id, localDate })}
          workTowardPending={pullGoalStepMutation.isPending}
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
            Milestones
          </h3>
          <button
            type="button"
            disabled={suggestBreakdownMutation.isPending}
            onClick={() => suggestBreakdownMutation.mutate({ goalId: goal.id })}
            className="text-caption text-ink-muted transition hover:text-ink disabled:opacity-40"
          >
            {suggestBreakdownMutation.isPending ? "Breaking down…" : "AI break down"}
          </button>
        </div>

        {suggestBreakdownMutation.isSuccess && ghostItems.length === 0 ? (
          <p className="text-caption text-ink-muted">No milestones to suggest right now.</p>
        ) : null}

        {ghostItems.length > 0 ? (
          <GhostedAccept
            items={ghostItems}
            stagedIds={stagedIds}
            applyLabel="Add milestones"
            onStage={(id) => {
              setStagedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onDismiss={(id) => {
              stageSuggestionMutation.mutate({ id, status: "dismissed" });
              setStagedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }}
            onApply={() => {
              void (async () => {
                for (const id of Array.from(stagedIds)) {
                  await stageSuggestionMutation.mutateAsync({ id, status: "staged" });
                }
                applySuggestionsMutation.mutate();
              })();
            }}
          />
        ) : null}

        <ul className="flex flex-col gap-2">
          {detail.milestones.map((m) => (
            <li key={m.id} className="rounded-control border border-subtle">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                onClick={() => setExpandedMilestoneId((cur) => (cur === m.id ? null : m.id))}
              >
                <span
                  className={`text-body ${m.isComplete ? "text-ink-muted line-through" : "text-ink"}`}
                >
                  {m.title}
                </span>
                <span className="shrink-0 text-caption text-ink-faint">
                  {m.taskCounts.completed}/{m.taskCounts.total} tasks
                </span>
              </button>

              {expandedMilestoneId === m.id ? (
                <div className="border-t border-subtle px-3 py-2">
                  <ul className="mb-2 flex flex-col gap-1">
                    {(expandedTasksQuery.data ?? []).map((task) => (
                      <li
                        key={task.id}
                        className={`text-caption ${task.completedAt ? "text-ink-muted line-through" : "text-ink"}`}
                      >
                        {task.title}
                        {task.timeEstimateMinutes ? (
                          <span className="text-ink-faint"> · {task.timeEstimateMinutes}m</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2">
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const title = newTaskTitle.trim();
                        if (!title) return;
                        createTaskMutation.mutate({
                          title,
                          category,
                          milestoneId: m.id,
                          bucketOverride: "later",
                        });
                        setNewTaskTitle("");
                      }}
                    >
                      <input
                        className="min-w-0 flex-1 rounded-control border border-subtle px-2 py-1 text-caption"
                        placeholder="New task…"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={createTaskMutation.isPending}
                        className="rounded-control border border-subtle px-2 py-1 text-caption disabled:opacity-40"
                      >
                        Add
                      </button>
                    </form>
                    <div className="flex flex-col gap-1">
                      <input
                        className="min-w-0 flex-1 rounded-control border border-subtle px-2 py-1 text-caption"
                        placeholder="Link an existing task…"
                        value={linkQuery}
                        onChange={(e) => setLinkQuery(e.target.value)}
                        aria-label="Search tasks to link to this milestone"
                      />
                      {linkQuery.trim() ? (
                        <ul className="max-h-40 overflow-y-auto rounded-control border border-subtle">
                          {linkCandidates.length === 0 ? (
                            <li className="px-2 py-1 text-caption text-ink-muted">
                              No matching tasks
                            </li>
                          ) : (
                            linkCandidates.map((t) => (
                              <li key={t.id}>
                                <button
                                  type="button"
                                  disabled={linkTaskMutation.isPending}
                                  onClick={() =>
                                    linkTaskMutation.mutate({ taskId: t.id, milestoneId: m.id })
                                  }
                                  className="flex w-full items-center gap-2 px-2 py-1 text-left text-caption hover:bg-[var(--accent-soft)] disabled:opacity-40"
                                >
                                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                                  {t.projectSlug ? (
                                    <span className="shrink-0 text-ink-muted">
                                      #{t.projectSlug}
                                    </span>
                                  ) : null}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                      {linkTaskMutation.isError ? (
                        <p className="text-caption text-critical">
                          Couldn&apos;t link that task — try again.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {!locked ? (
                    <button
                      type="button"
                      onClick={() => removeMilestoneMutation.mutate({ id: m.id })}
                      className="mt-2 text-caption text-critical hover:underline"
                    >
                      Remove milestone
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const title = newMilestoneTitle.trim();
            if (!title) return;
            createMilestoneMutation.mutate({ goalId: goal.id, title });
            setNewMilestoneTitle("");
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-control border border-subtle px-2 py-1.5 text-caption text-ink"
            placeholder="Add milestone…"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={createMilestoneMutation.isPending}
            className="rounded-control border border-subtle px-3 py-1.5 text-caption disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </section>
    </aside>
  );
}
