"use client";

import { useEffect, useMemo, useState } from "react";

import { BalanceBar } from "@/components/kash/plan/BalanceBar";
import { HandoffCaptureChat } from "@/components/kash/plan/HandoffCaptureChat";
import { KeyCap } from "@/components/kash/ui/KeyCap";
import { RitualSheet } from "@/components/kash/ui/RitualSheet";
import Button from "@/components/kash/ui/Button";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { CreateTaskItemEdit } from "@/lib/chat/proposed-actions";
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
import type { StagedCapture } from "@/lib/morning-handoff/staged-capture";
import { matchesTodayList } from "@/lib/tasks/matches-today-list";
import { isTriageCandidate } from "@/lib/tasks/triage-candidates";
import { cn } from "@/lib/cn";

const SLOT_LABELS = ["①", "②", "③"] as const;
const TOP3_SLOTS = [1, 2, 3] as const;
/** Gives the opener panel time to be read before nudging toward the dump. */
const OPENER_NUDGE_DELAY_MS = 12_000;

const ROW_ACTION =
  "rounded-pill border border-border px-2 py-0.5 text-caption text-ink transition hover:bg-[var(--accent-soft)]";
const ROW_ACTION_MUTED =
  "rounded-pill border border-border px-2 py-0.5 text-caption text-ink-muted transition hover:text-ink";

type ProjectRef = { id: string; slug: string; name: string };

type HoldPreview = {
  startMin: number;
  endMin: number;
  category: ProjectCategory;
};

type Top3Slot = 1 | 2 | 3;

/** A row in the right-column cart — either a live task or a not-yet-committed staged capture. */
type CartRow = {
  id: string;
  title: string;
  category: ProjectCategory | null;
  categoryUnresolved: boolean;
  isStaged: boolean;
  meta: string | null;
};

type Props = {
  localDate: string;
  opener: EssentialNudgeChipPayload | null;
  calendarSummaryLine?: string | null;
  tasks: HandoffPlanTask[];
  projects: ProjectRef[];
  pinnedBySlot: Map<number, HandoffPlanTask & { top3Order: number }>;
  stagedPinnedBySlot: Map<number, string>;
  stagedCaptures: StagedCapture[];
  holdPreview: HoldPreview | null;
  holdDeclined: boolean;
  isOverCommitted: boolean;
  goalOffer: GoalSteeringOffer | null;
  isPending: boolean;
  /** V8: onboarding ends on a hand-off preview so day 2 opens familiar. */
  previewBanner?: string | null;
  beginLabel?: string;
  /** True once the user has either resolved or explicitly deferred the carryover-first opener. */
  openerAcknowledged: boolean;
  onAcknowledgeOpener: () => void;
  onKeepCarryover: (taskId: string) => void;
  onDropCarryover: (taskId: string) => void;
  onConfirmRecurring: (recurrenceId: string, occurrenceDate: string) => void;
  onSkipRecurring: (recurrenceId: string, occurrenceDate: string) => void;
  onConfirmProjectTask: (taskId: string) => void;
  /** Defer a project-today suggestion off today (back to later). */
  onDeferProjectTask: (taskId: string) => void;
  onPullProjectTask: (taskId: string) => void;
  onAcceptGoalOffer: () => void;
  onDismissGoalOffer: () => void;
  onPinTop3: (taskId: string, slot: Top3Slot) => void;
  onUnpinTop3: (taskId: string) => void;
  onPinStagedTop3: (stagedId: string, slot: Top3Slot) => void;
  onUnpinStagedTop3: (stagedId: string) => void;
  onRemoveStaged: (stagedId: string) => void;
  /** Remove a live (already persisted) Today cart row — moves it off today. */
  onRemoveFromToday: (taskId: string) => void;
  onStageTasks: (edits: CreateTaskItemEdit[]) => void;
  /** Morning stages until Begin; onboarding preview applies immediately. */
  captureCommitMode?: "stage" | "apply";
  onTasksChanged?: () => void;
  onConfirmHold: () => void;
  onDeclineHold: () => void;
  onSkip: () => void;
  onBegin: () => void;
};

function categoryRowTint(
  category: ProjectCategory | null | undefined
): React.CSSProperties | undefined {
  if (category == null) return undefined;
  return {
    borderLeft: `3px solid ${categorySolidVar(category)}`,
    backgroundColor: categoryFillVar(category),
  };
}

function categorySurfaceTint(category: ProjectCategory): React.CSSProperties {
  return {
    borderColor: categorySolidVar(category),
    backgroundColor: categoryFillVar(category),
  };
}

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
  category,
}: {
  title: string;
  meta?: string;
  actions: React.ReactNode;
  /** When set, the row is tinted by its project category (left accent + soft fill). */
  category?: ProjectCategory | null;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-[var(--space-3)] border border-subtle bg-surface px-[var(--space-3)] py-[var(--space-2)]",
        category != null ? "rounded-r-row" : "rounded-row"
      )}
      style={categoryRowTint(category)}
    >
      <div className="min-w-0 flex-1">
        <p className="break-words text-body text-ink">{title}</p>
        {meta ? (
          <p
            className="mt-0.5 text-caption text-ink-muted"
            style={category != null ? { color: categoryTextVar(category) } : undefined}
          >
            {meta}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">{actions}</div>
    </div>
  );
}

/** A slot is occupied once either the live or the staged pin map claims it. */
function firstFreeTop3Slot(
  pinnedBySlot: Map<number, HandoffPlanTask>,
  stagedPinnedBySlot: Map<number, string>
): Top3Slot | null {
  for (const slot of TOP3_SLOTS) {
    if (!pinnedBySlot.has(slot) && !stagedPinnedBySlot.has(slot)) return slot;
  }
  return null;
}

function pinnedSlotForRow(
  row: CartRow,
  pinnedBySlot: Map<number, HandoffPlanTask>,
  stagedPinnedBySlot: Map<number, string>
): Top3Slot | null {
  for (const slot of TOP3_SLOTS) {
    const occupied = row.isStaged
      ? stagedPinnedBySlot.get(slot) === row.id
      : pinnedBySlot.get(slot)?.id === row.id;
    if (occupied) return slot;
  }
  return null;
}

function CartRowItem({
  row,
  pinnedSlot,
  freeSlot,
  onPin,
  onUnpin,
  onRemove,
}: {
  row: CartRow;
  pinnedSlot: Top3Slot | null;
  freeSlot: Top3Slot | null;
  onPin: () => void;
  onUnpin: () => void;
  onRemove?: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 border border-subtle px-[var(--space-3)] py-[var(--space-2)]",
        row.category != null ? "rounded-r-row" : "rounded-row",
        row.isStaged && "border-dashed"
      )}
      style={categoryRowTint(row.category)}
    >
      <button
        type="button"
        className="shrink-0 text-body"
        aria-label={pinnedSlot ? `Unpin ${row.title}` : `Pin ${row.title} to Top 3`}
        onClick={() => {
          if (pinnedSlot) {
            onUnpin();
            return;
          }
          if (freeSlot) onPin();
        }}
      >
        <span style={{ color: pinnedSlot ? "var(--accent)" : "var(--ink-faint)" }}>
          {pinnedSlot ? "★" : "☆"}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <span className="block break-words text-body text-ink">{row.title}</span>
        {row.meta ? <span className="block text-caption text-ink-muted">{row.meta}</span> : null}
      </div>
      {row.isStaged ? (
        <span className="shrink-0 rounded-pill border border-dashed border-border px-1.5 py-0.5 text-caption text-ink-muted">
          Staged
        </span>
      ) : null}
      {pinnedSlot ? <KeyCap className="shrink-0">{SLOT_LABELS[pinnedSlot - 1]}</KeyCap> : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${row.title} from today`}
          className="shrink-0 text-caption text-ink-muted transition hover:text-ink"
          onClick={onRemove}
        >
          ✕
        </button>
      ) : null}
    </li>
  );
}

export function MorningHandoffModal({
  localDate,
  opener,
  calendarSummaryLine = null,
  tasks,
  projects,
  pinnedBySlot,
  stagedPinnedBySlot,
  stagedCaptures,
  holdPreview,
  holdDeclined,
  isOverCommitted,
  goalOffer,
  isPending,
  previewBanner = null,
  beginLabel = "Begin day",
  openerAcknowledged,
  onAcknowledgeOpener,
  onKeepCarryover,
  onDropCarryover,
  onConfirmRecurring,
  onSkipRecurring,
  onConfirmProjectTask,
  onDeferProjectTask,
  onPullProjectTask,
  onAcceptGoalOffer,
  onDismissGoalOffer,
  onPinTop3,
  onUnpinTop3,
  onPinStagedTop3,
  onUnpinStagedTop3,
  onRemoveStaged,
  onRemoveFromToday,
  onStageTasks,
  captureCommitMode = "stage",
  onTasksChanged,
  onConfirmHold,
  onDeclineHold,
  onSkip,
  onBegin,
}: Props) {
  const [projectQuery, setProjectQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectPullOpen, setProjectPullOpen] = useState(false);
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

  const pendingProjectTaskIds = useMemo(
    () => new Set(projectTasksToday.map((task) => task.id)),
    [projectTasksToday]
  );

  const liveAssembled = useMemo(
    () =>
      filterAssembledTodayList(tasks, localDate).filter((task) => {
        if (isTriageCandidate(task, localDate)) return false;
        // While the opener is reviewing project-today rows, keep unconfirmed
        // ones off the cart so "Add to today" is a real left → right move.
        if (!openerAcknowledged && pendingProjectTaskIds.has(task.id)) return false;
        return true;
      }),
    [tasks, localDate, openerAcknowledged, pendingProjectTaskIds]
  );

  const cartRows = useMemo((): CartRow[] => {
    const liveRows: CartRow[] = liveAssembled.map((task) => ({
      id: task.id,
      title: task.title,
      category: task.category ?? null,
      categoryUnresolved: task.categoryUnresolved ?? false,
      isStaged: false,
      meta: task.projectSlug ? `#${task.projectSlug}` : null,
    }));
    const stagedRows: CartRow[] = stagedCaptures.map((capture) => ({
      id: capture.id,
      title: capture.title,
      category: capture.category,
      categoryUnresolved: false,
      isStaged: true,
      meta: capture.projectSlug ? `#${capture.projectSlug}` : null,
    }));
    return [...liveRows, ...stagedRows];
  }, [liveAssembled, stagedCaptures]);

  const balanceTasks = useMemo(
    () =>
      cartRows.map((row) => ({
        category: row.category,
        categoryUnresolved: row.categoryUnresolved,
        isTop3: pinnedSlotForRow(row, pinnedBySlot, stagedPinnedBySlot) != null,
      })),
    [cartRows, pinnedBySlot, stagedPinnedBySlot]
  );

  const top3SlotEntries = useMemo(
    () =>
      TOP3_SLOTS.map((slot) => {
        const liveTask = pinnedBySlot.get(slot);
        const stagedId = stagedPinnedBySlot.get(slot);
        const stagedTask = stagedId
          ? stagedCaptures.find((capture) => capture.id === stagedId)
          : undefined;
        return {
          slot,
          title: liveTask?.title ?? stagedTask?.title ?? null,
          category: liveTask?.category ?? stagedTask?.category ?? null,
        };
      }),
    [pinnedBySlot, stagedPinnedBySlot, stagedCaptures]
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

  const pinnedSlots = TOP3_SLOTS.map((slot) => {
    const task = pinnedBySlot.get(slot);
    return task ? { slot, task } : null;
  }).filter(
    (entry): entry is { slot: Top3Slot; task: HandoffPlanTask & { top3Order: number } } =>
      entry != null
  );

  const showHoldSection =
    pinnedSlots.length > 0 && holdPreview != null && !holdDeclined && !isOverCommitted;

  const openerPendingCount = carryovers.length + projectTasksToday.length;
  const dumpEnabled = openerAcknowledged || openerPendingCount === 0;
  const showOpenerPanel = !openerAcknowledged && openerPendingCount > 0;

  const [showOpenerNudge, setShowOpenerNudge] = useState(false);
  useEffect(() => {
    setShowOpenerNudge(false);
    if (!showOpenerPanel) return;
    const timer = setTimeout(() => setShowOpenerNudge(true), OPENER_NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showOpenerPanel, localDate]);

  return (
    <RitualSheet
      open
      title="Good morning"
      dismissOnBackdrop={false}
      dim="strong"
      size="wide"
      bodyLayout="fill"
      onDismiss={onSkip}
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
            {beginLabel}
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-[var(--space-4)]">
        <div className="shrink-0 space-y-[var(--space-2)]">
          {previewBanner ? (
            <p className="rounded-row border border-accent bg-[var(--accent-soft)] px-[var(--space-3)] py-[var(--space-2)] text-body text-ink">
              {previewBanner}
            </p>
          ) : null}
          <p className="rounded-row border border-subtle bg-surface-2 px-[var(--space-3)] py-[var(--space-2)] text-body text-ink">
            {openerText}
          </p>
          {calendarSummaryLine ? (
            <p className="text-body text-ink-muted">{calendarSummaryLine}</p>
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 gap-[var(--space-5)] overflow-y-auto lg:grid-cols-2 lg:overflow-visible">
          {/* Left: intake — carryover-first opener, recurring, and the dump chat. */}
          <div className="flex min-h-0 flex-col gap-[var(--space-4)] lg:h-full lg:overflow-y-auto lg:pr-[var(--space-2)]">
            {showOpenerPanel ? (
              <div className="shrink-0 space-y-[var(--space-3)] rounded-card border-emphasis border-accent bg-[var(--accent-soft)] p-[var(--space-4)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-body font-semibold text-ink">
                    Before you dump today&apos;s list
                  </h3>
                  <span className="shrink-0 rounded-pill border border-accent bg-surface px-2 py-0.5 text-caption font-medium text-ink">
                    {openerPendingCount} to review
                  </span>
                </div>

                {carryovers.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
                      Yesterday
                    </p>
                    {carryovers.map((task) => (
                      <TaskRow
                        key={task.id}
                        title={task.title}
                        meta="Unfinished from a prior day"
                        category={task.category}
                        actions={
                          <>
                            <button
                              type="button"
                              className={ROW_ACTION}
                              onClick={() => onKeepCarryover(task.id)}
                            >
                              Keep
                            </button>
                            <button
                              type="button"
                              className={ROW_ACTION_MUTED}
                              onClick={() => onDropCarryover(task.id)}
                            >
                              Drop
                            </button>
                          </>
                        }
                      />
                    ))}
                  </div>
                ) : null}

                {projectTasksToday.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
                      Project tasks today
                    </p>
                    {projectTasksToday.map((task) => (
                      <TaskRow
                        key={task.id}
                        title={task.title}
                        meta={task.projectSlug ? `#${task.projectSlug}` : undefined}
                        category={task.category}
                        actions={
                          <>
                            <button
                              type="button"
                              className={ROW_ACTION}
                              onClick={() => {
                                onConfirmProjectTask(task.id);
                                setDismissedProjectTasks((prev) => new Set(prev).add(task.id));
                              }}
                            >
                              Add to today
                            </button>
                            <button
                              type="button"
                              className={ROW_ACTION_MUTED}
                              onClick={() => {
                                onDeferProjectTask(task.id);
                                setDismissedProjectTasks((prev) => new Set(prev).add(task.id));
                              }}
                            >
                              Not today
                            </button>
                          </>
                        }
                      />
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-col gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-start text-caption"
                    onClick={onAcknowledgeOpener}
                    disabled={isPending}
                  >
                    I&apos;ll handle these later — start dump
                  </Button>
                  {showOpenerNudge ? (
                    <p className="text-caption text-ink-muted">
                      Still deciding? It&apos;s fine to start dumping new tasks now — you can come
                      back to these anytime before you begin.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {recurringToday.length > 0 ? (
              <Section title="Recurring today" className="shrink-0">
                {recurringToday.map((task) => {
                  const keys = resolveOccurrenceKeys(task);
                  if (!keys) return null;
                  return (
                    <TaskRow
                      key={task.id}
                      title={task.title}
                      meta="Recurring occurrence"
                      category={task.category}
                      actions={
                        <>
                          <button
                            type="button"
                            className={ROW_ACTION}
                            onClick={() => {
                              onConfirmRecurring(keys.recurrenceId, keys.occurrenceDate);
                              setDismissedRecurring((prev) => new Set(prev).add(task.id));
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className={ROW_ACTION_MUTED}
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

            <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-2)]">
              <h3 className="shrink-0 text-caption font-medium uppercase tracking-wide text-ink-muted">
                Add more
              </h3>
              <div className="flex min-h-0 flex-1 flex-col">
                <HandoffCaptureChat
                  dumpEnabled={dumpEnabled}
                  dumpLockedHint="Review carryovers above first — or skip to dump."
                  commitMode={captureCommitMode}
                  onStageTasks={onStageTasks}
                  onTasksChanged={onTasksChanged}
                />
              </div>

              {projects.length > 0 ? (
                <div className="shrink-0 space-y-[var(--space-2)]">
                  <button
                    type="button"
                    aria-expanded={projectPullOpen}
                    className={cn(
                      "rounded-pill border px-3 py-1 text-caption transition",
                      projectPullOpen
                        ? "border-ink bg-[var(--accent-soft)] text-ink"
                        : "border-border text-ink-muted hover:text-ink"
                    )}
                    onClick={() => setProjectPullOpen((v) => !v)}
                  >
                    Pull from a project
                  </button>
                  {projectPullOpen ? (
                    <div className="max-h-48 space-y-[var(--space-2)] overflow-y-auto rounded-row border border-subtle bg-surface-2 p-[var(--space-3)]">
                      <label
                        className="block text-caption text-ink-muted"
                        htmlFor="handoff-project-search"
                      >
                        Search projects
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
                                <span className="ml-2 text-caption text-ink-muted">
                                  #{project.slug}
                                </span>
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
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right: cart — Top 3, Today, and the balance preview. */}
          <div className="flex min-h-0 flex-col gap-[var(--space-4)] lg:h-full lg:overflow-y-auto lg:pr-[var(--space-1)]">
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
                      className={ROW_ACTION}
                      disabled={isPending}
                      onClick={onAcceptGoalOffer}
                    >
                      Add to today
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss goal step offer"
                      className={ROW_ACTION_MUTED}
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
              <ul className="grid grid-cols-3 gap-2">
                {top3SlotEntries.map(({ slot, title, category }) => (
                  <li
                    key={slot}
                    className="flex min-h-[var(--row-min-height)] flex-col justify-center gap-1 rounded-row border border-dashed border-subtle px-2 py-1.5"
                    style={category != null ? categorySurfaceTint(category) : undefined}
                  >
                    <KeyCap className="self-start">{SLOT_LABELS[slot - 1]}</KeyCap>
                    <span
                      className={cn("truncate text-caption", title ? "text-ink" : "text-ink-faint")}
                    >
                      {title ?? "Star a task below"}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            {showHoldSection ? (
              <Section title="Focus hold preview">
                <div
                  className="rounded-row border border-dashed px-[var(--space-3)] py-[var(--space-3)]"
                  style={categorySurfaceTint(holdPreview.category)}
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
                        style={categorySurfaceTint(category)}
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

            <Section title={`Today (${cartRows.length})`}>
              {cartRows.length === 0 ? (
                <p className="text-caption text-ink-muted">
                  Nothing yet — dump a few tasks on the left, or confirm a carryover.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {cartRows.map((row) => {
                    const pinnedSlot = pinnedSlotForRow(row, pinnedBySlot, stagedPinnedBySlot);
                    const freeSlot = firstFreeTop3Slot(pinnedBySlot, stagedPinnedBySlot);
                    return (
                      <CartRowItem
                        key={row.id}
                        row={row}
                        pinnedSlot={pinnedSlot}
                        freeSlot={freeSlot}
                        onPin={() => {
                          if (!freeSlot) return;
                          if (row.isStaged) onPinStagedTop3(row.id, freeSlot);
                          else onPinTop3(row.id, freeSlot);
                        }}
                        onUnpin={() => {
                          if (row.isStaged) onUnpinStagedTop3(row.id);
                          else onUnpinTop3(row.id);
                        }}
                        onRemove={
                          row.isStaged
                            ? () => onRemoveStaged(row.id)
                            : () => onRemoveFromToday(row.id)
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </Section>

            {cartRows.length > 0 ? (
              <Section title="Balance preview">
                <BalanceBar tasks={balanceTasks} showGhostWhenSparse />
              </Section>
            ) : null}
          </div>
        </div>
      </div>
    </RitualSheet>
  );
}
