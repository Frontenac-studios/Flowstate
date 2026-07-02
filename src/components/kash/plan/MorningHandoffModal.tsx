"use client";

import { useMemo, useState } from "react";

import { BalanceBar } from "@/components/kash/plan/BalanceBar";
import { QuickInput } from "@/components/kash/plan/QuickInput";
import { KeyCap } from "@/components/kash/ui/KeyCap";
import { RitualSheet } from "@/components/kash/ui/RitualSheet";
import Button from "@/components/kash/ui/Button";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import type { GoalSteeringOffer } from "@/lib/planning/goal-journey";
import {
  filterAssembledTodayList,
  filterProjectTasksDueToday,
  filterRecurringDueToday,
  filterTriageCarryovers,
  formatHoldSlotLabel,
  resolveOccurrenceKeys,
  type HandoffPlanTask,
} from "@/lib/morning-handoff/handoff-task-filters";
import { matchesTodayList } from "@/lib/tasks/matches-today-list";
import { isTriageCandidate } from "@/lib/tasks/triage-candidates";
import { cn } from "@/lib/cn";

const SLOT_LABELS = ["①", "②", "③"] as const;

type ProjectRef = { id: string; slug: string; name: string };

type HoldPreview = {
  startMin: number;
  endMin: number;
  category: ProjectCategory;
};

type Props = {
  localDate: string;
  opener: EssentialNudgeChipPayload | null;
  tasks: HandoffPlanTask[];
  projects: ProjectRef[];
  pinnedBySlot: Map<number, HandoffPlanTask & { top3Order: number }>;
  holdPreview: HoldPreview | null;
  holdDeclined: boolean;
  isOverCommitted: boolean;
  goalOffer: GoalSteeringOffer | null;
  isPending: boolean;
  onKeepCarryover: (taskId: string) => void;
  onDropCarryover: (taskId: string) => void;
  onConfirmRecurring: (recurrenceId: string, occurrenceDate: string) => void;
  onSkipRecurring: (recurrenceId: string, occurrenceDate: string) => void;
  onConfirmProjectTask: (taskId: string) => void;
  onPullProjectTask: (taskId: string) => void;
  onAcceptGoalOffer: () => void;
  onDismissGoalOffer: () => void;
  onPinTop3: (taskId: string, slot: 1 | 2 | 3) => void;
  onUnpinTop3: (taskId: string) => void;
  onConfirmHold: () => void;
  onDeclineHold: () => void;
  onSkip: () => void;
  onBegin: () => void;
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-[var(--space-3)]", className)}>
      <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">{title}</h3>
      {children}
    </section>
  );
}

function TaskRow({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-[var(--space-3)] rounded-row border border-subtle bg-surface px-[var(--space-3)] py-[var(--space-2)]">
      <div className="min-w-0 flex-1">
        <p className="break-words text-body text-ink">{title}</p>
        {meta ? <p className="mt-0.5 text-caption text-ink-muted">{meta}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">{actions}</div>
    </div>
  );
}

function firstFreeTop3Slot(pinnedBySlot: Map<number, HandoffPlanTask>): 1 | 2 | 3 | null {
  for (const slot of [1, 2, 3] as const) {
    if (!pinnedBySlot.has(slot)) return slot;
  }
  return null;
}

export function MorningHandoffModal({
  localDate,
  opener,
  tasks,
  projects,
  pinnedBySlot,
  holdPreview,
  holdDeclined,
  isOverCommitted,
  goalOffer,
  isPending,
  onKeepCarryover,
  onDropCarryover,
  onConfirmRecurring,
  onSkipRecurring,
  onConfirmProjectTask,
  onPullProjectTask,
  onAcceptGoalOffer,
  onDismissGoalOffer,
  onPinTop3,
  onUnpinTop3,
  onConfirmHold,
  onDeclineHold,
  onSkip,
  onBegin,
}: Props) {
  const [projectQuery, setProjectQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dismissedRecurring, setDismissedRecurring] = useState<Set<string>>(() => new Set());
  const [dismissedProjectTasks, setDismissedProjectTasks] = useState<Set<string>>(() => new Set());

  const openerText = opener?.message ?? "Take a breath — assemble today gently before you rank it.";

  const carryovers = useMemo(() => filterTriageCarryovers(tasks, localDate), [tasks, localDate]);

  const recurringToday = useMemo(() => {
    return filterRecurringDueToday(tasks, localDate).filter(
      (task) => !dismissedRecurring.has(task.id)
    );
  }, [tasks, localDate, dismissedRecurring]);

  const projectTasksToday = useMemo(() => {
    return filterProjectTasksDueToday(tasks, localDate).filter(
      (task) => !dismissedProjectTasks.has(task.id)
    );
  }, [tasks, localDate, dismissedProjectTasks]);

  const assembledList = useMemo(
    () =>
      filterAssembledTodayList(tasks, localDate).filter(
        (task) => !isTriageCarryover(task, localDate)
      ),
    [tasks, localDate]
  );

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projects.slice(0, 6);
    return projects.filter((p) => `${p.name} ${p.slug}`.toLowerCase().includes(q)).slice(0, 8);
  }, [projectQuery, projects]);

  const projectOpenTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(
      (task) =>
        task.projectId === selectedProjectId &&
        task.completedAt == null &&
        !task.isRecurringOccurrence &&
        !matchesTodayList(task, localDate)
    );
  }, [selectedProjectId, tasks, localDate]);

  const pinnedSlots = ([1, 2, 3] as const)
    .map((slot) => {
      const task = pinnedBySlot.get(slot);
      return task ? { slot, task } : null;
    })
    .filter(
      (entry): entry is { slot: 1 | 2 | 3; task: HandoffPlanTask & { top3Order: number } } =>
        entry != null
    );

  const showHoldSection =
    pinnedSlots.length > 0 && holdPreview != null && !holdDeclined && !isOverCommitted;

  return (
    <RitualSheet
      open
      title="Good morning"
      dismissOnBackdrop={false}
      footer={
        <div className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="text-body"
            onClick={onSkip}
            disabled={isPending}
          >
            Skip
          </Button>
          <Button type="button" className="text-body" onClick={onBegin} disabled={isPending}>
            Begin day
          </Button>
        </div>
      }
    >
      <div className="space-y-[var(--space-6)]">
        <p className="rounded-row border border-subtle bg-surface-2 px-[var(--space-3)] py-[var(--space-2)] text-body text-ink">
          {openerText}
        </p>

        {carryovers.length > 0 ? (
          <Section title="Yesterday">
            {carryovers.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                meta="Unfinished from a prior day"
                actions={
                  <>
                    <button
                      type="button"
                      className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]"
                      onClick={() => onKeepCarryover(task.id)}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink-muted transition hover:text-ink"
                      onClick={() => onDropCarryover(task.id)}
                    >
                      Drop
                    </button>
                  </>
                }
              />
            ))}
          </Section>
        ) : null}

        {recurringToday.length > 0 ? (
          <Section title="Recurring today">
            {recurringToday.map((task) => {
              const keys = resolveOccurrenceKeys(task);
              if (!keys) return null;
              return (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  meta="Recurring occurrence"
                  actions={
                    <>
                      <button
                        type="button"
                        className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]"
                        onClick={() => {
                          onConfirmRecurring(keys.recurrenceId, keys.occurrenceDate);
                          setDismissedRecurring((prev) => new Set(prev).add(task.id));
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink-muted transition hover:text-ink"
                        onClick={() => {
                          onSkipRecurring(keys.recurrenceId, keys.occurrenceDate);
                          setDismissedRecurring((prev) => new Set(prev).add(task.id));
                        }}
                      >
                        Skip
                      </button>
                    </>
                  }
                />
              );
            })}
          </Section>
        ) : null}

        {projectTasksToday.length > 0 ? (
          <Section title="Project tasks today">
            {projectTasksToday.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                meta={task.projectSlug ? `#${task.projectSlug}` : undefined}
                actions={
                  <button
                    type="button"
                    className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]"
                    onClick={() => {
                      onConfirmProjectTask(task.id);
                      setDismissedProjectTasks((prev) => new Set(prev).add(task.id));
                    }}
                  >
                    Add to today
                  </button>
                }
              />
            ))}
          </Section>
        ) : null}

        <Section title="Add more">
          <QuickInput draftStorageKey="morning-handoff" />
          <div className="space-y-[var(--space-2)] rounded-row border border-subtle bg-surface-2 p-[var(--space-3)]">
            <label className="block text-caption text-ink-muted" htmlFor="handoff-project-search">
              Pull from a project
            </label>
            <input
              id="handoff-project-search"
              type="search"
              value={projectQuery}
              onChange={(e) => {
                setProjectQuery(e.target.value);
                setSelectedProjectId(null);
              }}
              placeholder="Search projects…"
              className="w-full rounded-control border border-border bg-surface px-2 py-1.5 text-body text-ink"
            />
            {selectedProjectId == null ? (
              <ul className="space-y-1">
                {filteredProjects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      className="w-full rounded-row px-2 py-1 text-left text-body text-ink hover:bg-[var(--accent-soft)]"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      {project.name}
                      <span className="ml-2 text-caption text-ink-muted">#{project.slug}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  className="text-caption text-ink-muted hover:text-ink"
                  onClick={() => setSelectedProjectId(null)}
                >
                  ← Back to projects
                </button>
                {projectOpenTasks.length === 0 ? (
                  <p className="text-caption text-ink-muted">No open tasks to pull.</p>
                ) : (
                  <ul className="space-y-1">
                    {projectOpenTasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          className="w-full rounded-row px-2 py-1 text-left text-body text-ink hover:bg-[var(--accent-soft)]"
                          onClick={() => onPullProjectTask(task.id)}
                        >
                          {task.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Section>

        {goalOffer ? (
          <Section title="Goal step offer">
            <div className="flex items-start justify-between gap-3 rounded-row border border-dashed border-subtle bg-surface-2 px-[var(--space-3)] py-[var(--space-3)]">
              <div className="min-w-0 flex-1">
                <span className="mr-2 text-caption font-medium uppercase tracking-wide text-ink-muted">
                  ✦ suggested
                </span>
                <p className="text-body text-ink">
                  Work toward {goalOffer.goalTitle}: {goalOffer.stepTitle}
                </p>
                <p className="mt-1 text-caption text-ink-muted">{goalOffer.milestoneTitle}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Add ${goalOffer.stepTitle} to today`}
                  className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]"
                  disabled={isPending}
                  onClick={onAcceptGoalOffer}
                >
                  Add to today
                </button>
                <button
                  type="button"
                  aria-label="Dismiss goal step offer"
                  className="rounded-pill border border-border px-2 py-0.5 text-caption text-ink-muted transition hover:text-ink"
                  disabled={isPending}
                  onClick={onDismissGoalOffer}
                >
                  ✕
                </button>
              </div>
            </div>
          </Section>
        ) : isOverCommitted ? (
          <Section title="Goal step offer">
            <p className="text-caption text-ink-muted">
              Today is already full — goal steering will wait for a lighter morning.
            </p>
          </Section>
        ) : null}

        <Section title="Top 3">
          <p className="text-caption text-ink-muted">
            Choose from today&apos;s assembled list ({assembledList.length} task
            {assembledList.length === 1 ? "" : "s"}).
          </p>
          <ul className="space-y-1.5">
            {assembledList.map((task) => {
              const pinnedSlot = ([1, 2, 3] as const).find(
                (slot) => pinnedBySlot.get(slot)?.id === task.id
              );
              const freeSlot = firstFreeTop3Slot(pinnedBySlot);
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-row border border-subtle px-[var(--space-3)] py-[var(--space-2)]"
                >
                  <button
                    type="button"
                    className="shrink-0 text-body"
                    aria-label={pinnedSlot ? `Unpin ${task.title}` : `Pin ${task.title} to Top 3`}
                    onClick={() => {
                      if (pinnedSlot) {
                        onUnpinTop3(task.id);
                        return;
                      }
                      if (freeSlot) onPinTop3(task.id, freeSlot);
                    }}
                  >
                    <span style={{ color: pinnedSlot ? "var(--accent)" : "var(--ink-faint)" }}>
                      {pinnedSlot ? "★" : "☆"}
                    </span>
                  </button>
                  <span className="min-w-0 flex-1 break-words text-body text-ink">
                    {task.title}
                  </span>
                  {pinnedSlot ? (
                    <KeyCap className="shrink-0">{SLOT_LABELS[pinnedSlot - 1]}</KeyCap>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {assembledList.length === 0 ? (
            <p className="text-caption text-ink-muted">Confirm carryovers or add tasks above.</p>
          ) : null}
        </Section>

        {showHoldSection ? (
          <Section title="Focus hold preview">
            <div
              className="rounded-row border border-dashed px-[var(--space-3)] py-[var(--space-3)]"
              style={{
                borderColor: categorySolidVar(holdPreview.category),
                backgroundColor: categoryFillVar(holdPreview.category),
              }}
            >
              <p
                className="text-body font-medium"
                style={{ color: categoryTextVar(holdPreview.category) }}
              >
                45-minute hold for priority #1
              </p>
              <p
                className="mt-1 text-caption"
                style={{ color: categoryTextVar(holdPreview.category) }}
              >
                {formatHoldSlotLabel(holdPreview.startMin, holdPreview.endMin)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" className="text-caption" onClick={onConfirmHold}>
                  Place hold
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-caption"
                  onClick={onDeclineHold}
                >
                  Not today
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {([2, 3] as const).map((slot) => {
                const category = PROJECT_CATEGORIES[(slot - 1) % PROJECT_CATEGORIES.length]!;
                const pinned = pinnedBySlot.get(slot);
                if (pinned) return null;
                return (
                  <div
                    key={slot}
                    className="flex min-h-[var(--row-min-height)] items-center gap-2 rounded-pill border border-dashed px-3 py-[var(--row-py)]"
                    style={{
                      borderColor: categorySolidVar(category),
                      backgroundColor: categoryFillVar(category),
                    }}
                  >
                    <span className="text-caption" style={{ color: categoryTextVar(category) }}>
                      {SLOT_LABELS[slot - 1]} ghost hold
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {assembledList.length > 0 ? (
          <Section title="Balance preview">
            <BalanceBar tasks={assembledList} showGhostWhenSparse />
          </Section>
        ) : null}
      </div>
    </RitualSheet>
  );
}

function isTriageCarryover(task: HandoffPlanTask, todayIso: string): boolean {
  return isTriageCandidate(task, todayIso);
}
