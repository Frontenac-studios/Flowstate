"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BalanceBar } from "@/components/kash/plan/BalanceBar";
import { MorningTriageChat } from "@/components/kash/plan/MorningTriageChat";
import { CarryoverTriageCard } from "@/components/kash/plan/morning-triage/CarryoverTriageCard";
import { InboxPickCard } from "@/components/kash/plan/morning-triage/InboxPickCard";
import { ProjectPickCard } from "@/components/kash/plan/morning-triage/ProjectPickCard";
import type { TriagePickTask } from "@/components/kash/plan/morning-triage/TriageTaskPickList";
import { TRIAGE_CHIP_MUTED } from "@/components/kash/plan/morning-triage/triage-pick-styles";
import { KeyCap } from "@/components/kash/ui/KeyCap";
import { RitualSheet } from "@/components/kash/ui/RitualSheet";
import Button from "@/components/kash/ui/Button";
import Tooltip from "@/components/kash/ui/Tooltip";
import {
  formatMeetingTooltipLines,
  type MeetingTooltipEvent,
} from "@/lib/calendar/meeting-tooltip";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { CreateTaskItemEdit } from "@/lib/chat/proposed-actions";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import type { GoalSteeringOffer } from "@/lib/planning/goal-journey";
import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import {
  formatGreetingOpener,
  formatGreetingTitle,
  resolveGreetingPeriod,
} from "@/lib/morning-handoff/greeting";
import {
  advanceAfterSkip,
  dumpUnlocked,
  nextPhaseAfterComplete,
  resolveInitialPhase,
  shouldCircleBackToProjects,
  type MorningTriagePhase,
} from "@/lib/morning-handoff/morning-triage-phase";
import {
  collectProjectMorningSuggestions,
  filterAssembledTodayList,
  filterInboxUnscheduled,
  filterLookbackCarryovers,
  formatHoldSlotLabel,
  paceSuggestions,
  type HandoffPlanTask,
} from "@/lib/morning-handoff/handoff-task-filters";
import type { StagedCapture } from "@/lib/morning-handoff/staged-capture";
import { isTriageCandidate } from "@/lib/tasks/triage-candidates";
import { cn } from "@/lib/cn";

const SLOT_LABELS = ["①", "②", "③"] as const;
const TOP3_SLOTS = [1, 2, 3] as const;

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
  projectName: string | null;
};

type Props = {
  localDate: string;
  opener: EssentialNudgeChipPayload | null;
  calendarSummaryLine?: string | null;
  /** Timed events behind the summary line — shown in its hover tooltip. */
  calendarMeetings?: readonly MeetingTooltipEvent[] | null;
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
  /** Override triage phase (onboarding preview lands on dump). */
  initialPhase?: MorningTriagePhase;
  onKeepCarryover: (taskId: string) => void;
  onDropCarryover: (taskId: string) => void;
  /** Hover-✓ on a triage row: complete the task in place. */
  onCompleteTask?: (taskId: string) => void;
  onConfirmProjectTask: (taskId: string) => void;
  /** Defer a project-today suggestion off today (back to later). */
  onDeferProjectTask: (taskId: string) => void;
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

function toPickTask(task: HandoffPlanTask): TriagePickTask {
  return {
    id: task.id,
    title: task.title,
    projectName: task.projectName ?? null,
    category: task.category,
  };
}

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
        <span className="block break-words text-body text-ink">
          {row.title}
          {row.projectName ? (
            <span
              className="text-caption text-ink-muted"
              style={row.category != null ? { color: categoryTextVar(row.category) } : undefined}
            >
              {" "}
              · {row.projectName}
            </span>
          ) : null}
        </span>
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
  calendarMeetings = null,
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
  initialPhase,
  onKeepCarryover,
  onDropCarryover,
  onCompleteTask,
  onConfirmProjectTask,
  onDeferProjectTask,
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
  const period = resolveGreetingPeriod();
  const greetingTitle = formatGreetingTitle(period);

  const counts = useMemo(
    () => ({
      carryoverCount: filterLookbackCarryovers(tasks, localDate).length,
      inboxCount: filterInboxUnscheduled(tasks).length,
    }),
    [tasks, localDate]
  );

  const [phase, setPhase] = useState<MorningTriagePhase>(
    () => initialPhase ?? resolveInitialPhase(counts)
  );
  const [dismissedProjectIds, setDismissedProjectIds] = useState<Set<string>>(() => new Set());
  const [projectsSkipped, setProjectsSkipped] = useState(false);
  const [projectsResolved, setProjectsResolved] = useState(false);
  const [skippedToDump, setSkippedToDump] = useState(false);
  const [projectSuggestionOffset, setProjectSuggestionOffset] = useState(0);
  const [circleBackReviewing, setCircleBackReviewing] = useState(false);

  // Read latest tasks when the day changes without resetting mid-session on Keep/Drop.
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    const dayTasks = tasksRef.current;
    const dayCounts = {
      carryoverCount: filterLookbackCarryovers(dayTasks, localDate).length,
      inboxCount: filterInboxUnscheduled(dayTasks).length,
    };
    setPhase(initialPhase ?? resolveInitialPhase(dayCounts));
    setDismissedProjectIds(new Set());
    setProjectsSkipped(false);
    setProjectsResolved(false);
    setSkippedToDump(false);
    setProjectSuggestionOffset(0);
    setCircleBackReviewing(false);
  }, [localDate, initialPhase]);

  const carryovers = useMemo(() => filterLookbackCarryovers(tasks, localDate), [tasks, localDate]);

  const yesterdayIso = toISODateString(addDays(parseISODateString(localDate), -1));

  const lookbackLabel =
    carryovers.length > 0 && carryovers.every((task) => task.scheduledDate === yesterdayIso)
      ? "yesterday"
      : "the last few days";

  const allProjectSuggestions = useMemo(
    () => collectProjectMorningSuggestions(tasks, localDate),
    [tasks, localDate]
  );

  const remainingProjectSuggestions = useMemo(
    () => allProjectSuggestions.filter((s) => !dismissedProjectIds.has(s.task.id)),
    [allProjectSuggestions, dismissedProjectIds]
  );

  const inboxTasks = useMemo(
    () => filterInboxUnscheduled(tasks).filter((task) => !dismissedProjectIds.has(task.id)),
    [tasks, dismissedProjectIds]
  );

  const pacedProjects = useMemo(
    () =>
      paceSuggestions(remainingProjectSuggestions, {
        offset: projectSuggestionOffset,
        batch: 5,
      }),
    [remainingProjectSuggestions, projectSuggestionOffset]
  );

  const advancePhase = useCallback(
    (from: MorningTriagePhase) => {
      setPhase(nextPhaseAfterComplete(from, counts));
    },
    [counts]
  );

  useEffect(() => {
    if (phase !== "carryovers" || carryovers.length > 0) return;
    advancePhase("carryovers");
  }, [phase, carryovers.length, advancePhase]);

  useEffect(() => {
    if (phase !== "inbox" || inboxTasks.length > 0) return;
    advancePhase("inbox");
  }, [phase, inboxTasks.length, advancePhase]);

  useEffect(() => {
    if (phase !== "projects" || remainingProjectSuggestions.length > 0) return;
    if (dismissedProjectIds.size === 0 && !projectsSkipped) return;
    setProjectsResolved(true);
    advancePhase("projects");
  }, [
    phase,
    remainingProjectSuggestions.length,
    dismissedProjectIds.size,
    projectsSkipped,
    advancePhase,
  ]);

  const dismissProjectIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setDismissedProjectIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const handleKeepCarryoverIds = useCallback(
    (ids: string[]) => {
      for (const id of ids) onKeepCarryover(id);
    },
    [onKeepCarryover]
  );

  const handleDropCarryoverIds = useCallback(
    (ids: string[]) => {
      for (const id of ids) onDropCarryover(id);
    },
    [onDropCarryover]
  );

  const handleAddProjectIds = useCallback(
    (ids: string[]) => {
      for (const id of ids) onConfirmProjectTask(id);
      dismissProjectIds(ids);
    },
    [onConfirmProjectTask, dismissProjectIds]
  );

  const handleDeferProjectIds = useCallback(
    (ids: string[]) => {
      for (const id of ids) onDeferProjectTask(id);
      dismissProjectIds(ids);
    },
    [onDeferProjectTask, dismissProjectIds]
  );

  const handleSkipProjects = useCallback(() => {
    setProjectsSkipped(true);
    advancePhase("projects");
  }, [advancePhase]);

  const handleProjectsEmptyContinue = useCallback(() => {
    setProjectsResolved(true);
    advancePhase("projects");
  }, [advancePhase]);

  const handleSkipInbox = useCallback(() => {
    advancePhase("inbox");
  }, [advancePhase]);

  const handleSkipToDump = useCallback(() => {
    setSkippedToDump(true);
    setPhase(advanceAfterSkip(phase));
  }, [phase]);

  const showCircleBack = shouldCircleBackToProjects({
    projectsSkipped,
    projectsResolved,
    hasRemainingSuggestions: remainingProjectSuggestions.length > 0,
    phase,
  });

  const scriptedMessages = useMemo(() => {
    const messages = [
      {
        id: "greeting-opener",
        role: "assistant" as const,
        text: formatGreetingOpener(period),
      },
    ];
    if (period !== "late" && opener?.message) {
      messages.push({
        id: "essential-nudge",
        role: "assistant" as const,
        text: opener.message,
      });
    }
    return messages;
  }, [period, opener?.message]);

  const actSlot = useMemo(() => {
    if (showCircleBack) {
      if (circleBackReviewing) {
        const pickTasks = pacedProjects.batch.map((s) => toPickTask(s.task));
        return (
          <div className="space-y-2">
            <ProjectPickCard
              intro="Here are a few project tasks that look relevant — add any to Today?"
              tasks={pickTasks}
              onAddIds={handleAddProjectIds}
              onDeferIds={handleDeferProjectIds}
              onShowMore={
                pacedProjects.hasMore
                  ? () => setProjectSuggestionOffset(pacedProjects.nextOffset)
                  : undefined
              }
              showMoreDisabled={isPending}
              onCompleteTask={onCompleteTask}
              disabled={isPending}
            />
            <button
              type="button"
              className={TRIAGE_CHIP_MUTED}
              disabled={isPending}
              onClick={() => {
                setCircleBackReviewing(false);
                setProjectsResolved(true);
              }}
            >
              Not now
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
          <p className="text-body text-ink">Still want to pull any project tasks?</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={TRIAGE_CHIP_MUTED}
              disabled={isPending}
              onClick={() => setCircleBackReviewing(true)}
            >
              Review
            </button>
            <button
              type="button"
              className={TRIAGE_CHIP_MUTED}
              disabled={isPending}
              onClick={() => setProjectsResolved(true)}
            >
              Not now
            </button>
          </div>
        </div>
      );
    }

    switch (phase) {
      case "carryovers":
        if (carryovers.length === 0) return null;
        return (
          <CarryoverTriageCard
            tasks={carryovers.map(toPickTask)}
            onKeepIds={handleKeepCarryoverIds}
            onDropIds={handleDropCarryoverIds}
            onCompleteTask={onCompleteTask}
            lookbackLabel={lookbackLabel}
            disabled={isPending}
          />
        );

      case "projects":
        if (remainingProjectSuggestions.length > 0) {
          return (
            <div className="space-y-2">
              <ProjectPickCard
                intro="Here are a few project tasks that look relevant — add any to Today?"
                tasks={pacedProjects.batch.map((s) => toPickTask(s.task))}
                onAddIds={handleAddProjectIds}
                onDeferIds={handleDeferProjectIds}
                onShowMore={
                  pacedProjects.hasMore
                    ? () => setProjectSuggestionOffset(pacedProjects.nextOffset)
                    : undefined
                }
                showMoreDisabled={isPending}
                onCompleteTask={onCompleteTask}
                disabled={isPending}
              />
              <button
                type="button"
                className={TRIAGE_CHIP_MUTED}
                disabled={isPending}
                onClick={handleSkipProjects}
              >
                Skip projects
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-2 rounded-row border border-dashed border-border bg-surface px-2.5 py-2">
            <p className="text-body text-ink">Anything from projects you want on Today?</p>
            <button
              type="button"
              className={TRIAGE_CHIP_MUTED}
              disabled={isPending}
              onClick={handleProjectsEmptyContinue}
            >
              Not right now
            </button>
          </div>
        );

      case "inbox":
        if (inboxTasks.length === 0) return null;
        return (
          <InboxPickCard
            intro="A few inbox captures have no day yet — schedule any for today?"
            tasks={inboxTasks.map(toPickTask)}
            onAddIds={handleAddProjectIds}
            onSkip={handleSkipInbox}
            onCompleteTask={onCompleteTask}
            disabled={isPending}
          />
        );

      default:
        return null;
    }
  }, [
    showCircleBack,
    circleBackReviewing,
    phase,
    carryovers,
    lookbackLabel,
    onCompleteTask,
    handleKeepCarryoverIds,
    handleDropCarryoverIds,
    remainingProjectSuggestions.length,
    pacedProjects,
    handleAddProjectIds,
    handleDeferProjectIds,
    handleSkipProjects,
    handleProjectsEmptyContinue,
    inboxTasks,
    handleSkipInbox,
    isPending,
  ]);

  const dumpEnabled = dumpUnlocked(phase, skippedToDump);

  const liveAssembled = useMemo(
    () =>
      filterAssembledTodayList(tasks, localDate).filter(
        (task) => !isTriageCandidate(task, localDate)
      ),
    [tasks, localDate]
  );

  const cartRows = useMemo((): CartRow[] => {
    const liveRows: CartRow[] = liveAssembled.map((task) => ({
      id: task.id,
      title: task.title,
      category: task.category ?? null,
      categoryUnresolved: task.categoryUnresolved ?? false,
      isStaged: false,
      projectName: task.projectName ?? null,
    }));
    const stagedRows: CartRow[] = stagedCaptures.map((capture) => ({
      id: capture.id,
      title: capture.title,
      category: capture.category,
      categoryUnresolved: false,
      isStaged: true,
      projectName: capture.projectSlug
        ? (projects.find((project) => project.slug === capture.projectSlug)?.name ?? null)
        : null,
    }));
    return [...liveRows, ...stagedRows];
  }, [liveAssembled, stagedCaptures, projects]);

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

  const pinnedSlots = TOP3_SLOTS.map((slot) => {
    const task = pinnedBySlot.get(slot);
    return task ? { slot, task } : null;
  }).filter(
    (entry): entry is { slot: Top3Slot; task: HandoffPlanTask & { top3Order: number } } =>
      entry != null
  );

  const showHoldSection =
    pinnedSlots.length > 0 && holdPreview != null && !holdDeclined && !isOverCommitted;

  const meetingLines = useMemo(
    () => formatMeetingTooltipLines(calendarMeetings ?? []),
    [calendarMeetings]
  );

  return (
    <RitualSheet
      open
      title={greetingTitle}
      dismissOnBackdrop={false}
      dim="strong"
      size="xl"
      bodyLayout="fill"
      onDismiss={onSkip}
    >
      <div className="flex h-full min-h-0 flex-col gap-[var(--space-4)]">
        <div className="shrink-0 space-y-[var(--space-2)]">
          {previewBanner ? (
            <p className="rounded-row border border-accent bg-[var(--accent-soft)] px-[var(--space-3)] py-[var(--space-2)] text-body text-ink">
              {previewBanner}
            </p>
          ) : null}
          {calendarSummaryLine ? (
            meetingLines.length > 0 ? (
              <p className="text-body text-ink-muted">
                <Tooltip
                  variant="light"
                  focusable
                  content={
                    <ul className="space-y-0.5">
                      {meetingLines.map((line) => (
                        <li key={line.key} className="whitespace-nowrap">
                          <span className="text-ink-muted">{line.timeLabel}</span>{" "}
                          <span className="text-ink">{line.title}</span>
                        </li>
                      ))}
                    </ul>
                  }
                >
                  <span
                    className="cursor-default"
                    style={{ borderBottom: "1px dotted var(--ink-muted)" }}
                  >
                    {calendarSummaryLine}
                  </span>
                </Tooltip>
              </p>
            ) : (
              <p className="text-body text-ink-muted">{calendarSummaryLine}</p>
            )
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 gap-[var(--space-5)] overflow-y-auto lg:grid-cols-2 lg:overflow-visible">
          {/* Left: chat-first morning triage with in-thread act cards. */}
          <div className="flex min-h-0 flex-col lg:h-full lg:overflow-y-auto lg:pr-[var(--space-2)]">
            <MorningTriageChat
              dumpEnabled={dumpEnabled}
              dumpLockedHint="Finish the steps above first — or skip to dump."
              commitMode={captureCommitMode}
              onStageTasks={onStageTasks}
              onTasksChanged={onTasksChanged}
              scriptedMessages={scriptedMessages}
              actSlot={actSlot}
              skipToDumpLabel="I'll handle these later — start dump"
              onSkipToDump={handleSkipToDump}
            />
          </div>

          {/* Right: cart — Top 3, Today, the balance preview, and the sheet actions. */}
          <div className="flex min-h-0 flex-col lg:h-full">
            <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-4)] lg:overflow-y-auto lg:pr-[var(--space-1)]">
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
                        className={cn(
                          "truncate text-caption",
                          title ? "text-ink" : "text-ink-faint"
                        )}
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
                          <span
                            className="text-caption"
                            style={{ color: categoryTextVar(category) }}
                          >
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
                    Nothing yet — chat with Kash on the left, or keep a carryover.
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

            <div className="flex shrink-0 flex-col gap-[var(--space-2)] pt-[var(--space-4)] sm:flex-row sm:justify-end">
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
          </div>
        </div>
      </div>
    </RitualSheet>
  );
}
