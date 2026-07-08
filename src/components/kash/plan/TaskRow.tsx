"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
} from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import OccurrenceMenu from "@/components/kash/plan/OccurrenceMenu";
import { ComposerAssistInput } from "@/components/kash/composer/ComposerAssistInput";
import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import { Lock, withKashIcon } from "@/components/kash/ui/icon";
import { TaskTagChips } from "@/components/kash/plan/TaskTagChips";
import Checkbox from "@/components/kash/ui/Checkbox";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";
import { useTrackpadSwipeReveal } from "@/hooks/useTrackpadSwipeReveal";
import { buildComposerConfig } from "@/lib/parser/composer-assist";
import { parseQuickInput } from "@/lib/parser/parse-quick-input";
import { formatRelativeDue } from "@/lib/dates/format-relative-due";
import { parseISODateString } from "@/lib/dates/local-day";
import { categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { phaseRampColor } from "@/lib/projects/project-phase-color";
import { type RevealFlags } from "@/lib/tasks/lens";
import { getTaskTitleError } from "@/lib/taskValidation";
import { MOTION_TOKEN, readMotionDurationMs } from "@/lib/animate/motion-tokens";
import { useTRPC, type RouterOutputs } from "@/trpc/client";

import { useReveal } from "./LensProvider";
import { optimisticPatch, rollbackPatches } from "./optimistic-cache";

type RecentlyCompletedRow = RouterOutputs["tasks"]["listRecentlyCompleted"][number];

export type PlanTaskRow = {
  id: string;
  title: string;
  priority: number;
  projectId: string | null;
  projectSlug: string | null;
  projectName: string | null;
  isTop3: boolean;
  /** Week day-priority slot (1–3) when pinned for a weekday (WD1). */
  dayPriorityOrder?: number | null;
  // Optional so list builders that don't yet select category still type-check;
  // surfaced under the category lens as the life-area stripe (1.4b) or neutral
  // marker (1.4d).
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
  tags?: string[] | null;
  /** Live dependency state (Phase 3 / F2). */
  isBlocked?: boolean;
  blockedByIds?: string[];
  /** Optional title lookup for "waiting on X" copy. */
  taskTitleById?: Record<string, string>;
  // Surfaced under the due lens as a relative label (VF-1).
  scheduledDate?: string | null;
  /**
   * Chat-proposed day carried on an unscheduled inbox task. When set with a null
   * scheduledDate, the inbox surfaces a chip + Accept button (chat-first creation).
   */
  suggestedScheduledDate?: string | null;
  // Phase identity for the project lens (VF-4): name shown as "Project · Phase",
  // sortOrder drives the phase-ramp dot color.
  phaseName?: string | null;
  phaseSortOrder?: number | null;
  /** Virtual recurring occurrence (Phase 4). */
  isRecurringOccurrence?: boolean;
  recurrenceId?: string;
  occurrenceDate?: string;
  templateTaskId?: string;
  recurringLabel?: string;
};

const NEUTRAL_CATEGORY_STRIPE = "var(--ink-faint)";
const LockIcon = withKashIcon(Lock);

type Props = {
  task: PlanTaskRow;
  selected?: boolean;
  onSelect?: (taskId: string) => void;
  /** Double-click / activate — opens the task in focus mode. */
  onActivate?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onPin?: (taskId: string, sourceEl: HTMLElement) => void;
  canPin?: boolean;
  /** Surfaces that are already project-scoped pass false to never reveal project. */
  showProject?: boolean;
  /**
   * Explicit reveal override. Normally omitted — the row reads the active lens
   * from the surrounding `LensProvider` via `useReveal()` (VF-2).
   */
  reveal?: RevealFlags;
  /** Day-grouped surfaces (Today, This Week) suppress the due lens (VF5). */
  suppressDue?: boolean;
  /** AN-T2: stagger index for Today list arrival; omit on other surfaces. */
  arriveIndex?: number;
  /** AN §5 / WD7: scale + shadow lift while dragging on the Week surface. */
  weekDragLift?: boolean;
  /**
   * Inbox-only: when true, an unscheduled task carrying a `suggestedScheduledDate`
   * shows a chip + Accept button that commits the chat-suggested day.
   */
  showSuggestedDate?: boolean;
  /**
   * P6 post-create feedback: pulse class applied to the row's own `<li>` (rather
   * than wrapping it in another `<li>`, which would nest list items).
   */
  highlightClassName?: string;
  /** P6: ref to the row's `<li>` so a surface can scroll the created task into view. */
  highlightRef?: Ref<HTMLLIElement>;
};

const ACTION_WIDTH_PX = 72;
const REVEAL_WIDTH_PX = ACTION_WIDTH_PX * 2;
const MAX_ARRIVE_STAGGER = 12;

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Thu 10" — weekday + day-of-month, unambiguous for out-of-week suggestions. */
function suggestionLabel(iso: string): string {
  const date = parseISODateString(iso);
  return `${SHORT_WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

/** "Thu" — short weekday for the compact Accept button. */
function suggestionWeekday(iso: string): string {
  return SHORT_WEEKDAYS[parseISODateString(iso).getDay()];
}

export function TaskRow({
  task,
  selected = false,
  onSelect,
  onActivate,
  onComplete,
  onDelete,
  onPin,
  canPin = false,
  showProject = true,
  reveal,
  suppressDue = false,
  arriveIndex,
  weekDragLift = false,
  showSuggestedDate = false,
  highlightClassName,
  highlightRef,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editError, setEditError] = useState<string | null>(null);

  // Composer autocomplete for inline edit — same grammar as capture, minus a
  // `due` segment (tasks.update can't persist scheduledDate). Both queries are
  // shared/cached across rows and only run once a row enters edit mode.
  const { data: projects = [] } = useQuery({
    ...trpc.projects.list.queryOptions(),
    enabled: editing,
  });
  const { data: tagVocabulary = [] } = useQuery({
    ...trpc.tasks.listTagVocabulary.queryOptions(),
    enabled: editing,
  });
  const projectRefs = useMemo(
    () => projects.map((p) => ({ slug: p.slug, name: p.name })),
    [projects]
  );
  const editAssistConfig = useMemo(
    () =>
      buildComposerConfig(
        { projects: projectRefs, tagVocabulary },
        { properties: ["title", "priority", "project", "category"] }
      ),
    [projectRefs, tagVocabulary]
  );
  // AN-T1: drives the completion choreography — category-color checkbox, struck
  // title, slide-out — set optimistically on check so it plays before the
  // server round-trip resolves.
  const [completing, setCompleting] = useState(false);
  const [occurrenceMenuOpen, setOccurrenceMenuOpen] = useState(false);
  const rowContentRef = useRef<HTMLDivElement>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinEnabled = canPin && !task.isTop3 && !task.dayPriorityOrder && onPin != null;

  // Clean by default; indicators reveal per active lens (VF-2). The surrounding
  // LensProvider renders clean on the server / first paint, then hydrates from
  // storage — so no hydration mismatch. An explicit `reveal` prop overrides it.
  const lensReveal = useReveal();
  const activeReveal = reveal ?? lensReveal;

  // Life-area stripe (Kash 3.0): an always-on category channel. Colour comes from
  // the --cat-*-solid token (so user category-colour overrides apply); a neutral
  // marker shows when the category is unresolved. The richer category treatments
  // (list grouping, fills) stay lens-gated — only the stripe is persistent.
  const resolvedCategory = task.category && !task.categoryUnresolved ? task.category : null;
  const stripeColor = resolvedCategory
    ? categorySolidVar(resolvedCategory)
    : NEUTRAL_CATEGORY_STRIPE;
  const stripeLabel = resolvedCategory ? categoryLabel(resolvedCategory) : "No category yet";

  const relativeDue =
    activeReveal.due && !suppressDue ? formatRelativeDue(task.scheduledDate) : null;
  // Inbox-only: an unscheduled task carrying a chat-suggested day offers a
  // one-tap Accept that commits the suggestion (Phase 4). A committed task
  // (non-null scheduledDate) never shows it.
  const suggestion =
    showSuggestedDate && task.suggestedScheduledDate && !task.scheduledDate
      ? task.suggestedScheduledDate
      : null;
  const isBlocked = task.isBlocked === true;
  const blockerLabel = useMemo(() => {
    if (!isBlocked || !task.blockedByIds?.length) return null;
    const lookup = task.taskTitleById;
    const firstId = task.blockedByIds[0];
    const title = lookup?.[firstId];
    if (title) return title;
    return task.blockedByIds.length === 1 ? "blocker" : `${task.blockedByIds.length} blockers`;
  }, [isBlocked, task.blockedByIds, task.taskTitleById]);
  const isOverdue = relativeDue?.emphasis === "danger";
  const dueEmphasisClass =
    relativeDue?.emphasis === "danger"
      ? "font-medium text-[var(--due-overdue)]"
      : relativeDue?.emphasis === "soon"
        ? "font-medium text-[var(--due-soon)]"
        : "text-[var(--due-future)]";
  const showProjectIndicator = Boolean(activeReveal.project && showProject && task.projectName);
  const { offset, hide, isOpen, isLeftOpen, isRightOpen, containerRef } = useTrackpadSwipeReveal({
    maxOffsetRight: REVEAL_WIDTH_PX,
    maxOffsetLeft: pinEnabled ? ACTION_WIDTH_PX : 0,
  });

  const invalidatePlan = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listRecentlyCompleted.queryKey() });
    void queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());
  };

  // Let the slide-out finish before the refetch unmounts the row (AN-T1); the
  // server completion has already landed, this only paces the visual handoff
  // into the Completed section.
  const invalidatePlanAfterSlide = () => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(
      invalidatePlan,
      readMotionDurationMs(MOTION_TOKEN.medium)
    );
  };

  useEffect(
    () => () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!weekDragLift) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [weekDragLift]);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: `task:${task.id}`,
      disabled: editing || isOpen,
      data: { taskId: task.id },
    });

  const { tabIndex, ...dragAttributes } = attributes;
  void tabIndex;

  // Compose the dnd node ref with the optional highlight ref so a single `<li>`
  // serves as both the drag node and the scroll target (no nested wrapper).
  const setRootRef = useCallback(
    (node: HTMLLIElement | null) => {
      setNodeRef(node);
      if (typeof highlightRef === "function") {
        highlightRef(node);
      } else if (highlightRef) {
        (highlightRef as MutableRefObject<HTMLLIElement | null>).current = node;
      }
    },
    [setNodeRef, highlightRef]
  );

  const completeMutation = useMutation(
    trpc.tasks.complete.mutationOptions({
      // The row's slide-out is already optimistic via `completing`; this also
      // drops the task into the "Completed" tail instantly (its feed only
      // refetches after the slide, so without this the tail lags a beat).
      onMutate: async () => {
        const category = task.category;
        if (!category) return undefined;
        const snapshot = await optimisticPatch<RecentlyCompletedRow[]>(
          queryClient,
          trpc.tasks.listRecentlyCompleted.queryKey(),
          (old) => [
            {
              id: task.id,
              title: task.title,
              completedAt: new Date(),
              projectSlug: task.projectSlug,
              category,
              categoryUnresolved: task.categoryUnresolved ?? false,
            },
            ...old.filter((t) => t.id !== task.id),
          ]
        );
        return { snapshots: [snapshot] };
      },
      onSuccess: (data) => {
        onComplete(data.task.id, data.previousCompletedAt);
        invalidatePlanAfterSlide();
      },
      onError: (_err, _vars, ctx) => {
        setCompleting(false);
        rollbackPatches(queryClient, ctx?.snapshots);
      },
    })
  );

  const completeOccurrenceMutation = useMutation(
    trpc.recurrence.completeOccurrence.mutationOptions({
      onSuccess: () => {
        onComplete(task.id, null);
        invalidatePlanAfterSlide();
      },
      onError: () => setCompleting(false),
    })
  );

  const updateMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        setEditError(null);
        hide();
        invalidatePlan();
      },
      onError: () => setEditError("Couldn't save your change — please try again."),
    })
  );

  const skipOccurrenceMutation = useMutation(
    trpc.recurrence.skipOccurrence.mutationOptions({
      onSuccess: () => {
        hide();
        invalidatePlan();
      },
      onError: () =>
        toast({ message: "Couldn't skip this one. Please try again.", variant: "error" }),
    })
  );

  const editOccurrenceMutation = useMutation(
    trpc.recurrence.editOccurrence.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        setEditError(null);
        hide();
        invalidatePlan();
      },
      onError: () => setEditError("Couldn't save your change — please try again."),
    })
  );

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: (data) => {
        onDelete(data.snapshot);
        hide();
        invalidatePlan();
      },
      onError: () =>
        toast({ message: "Couldn't delete this task. Please try again.", variant: "error" }),
    })
  );

  const acceptSuggestedDateMutation = useMutation(
    trpc.tasks.acceptSuggestedDate.mutationOptions({
      onSuccess: () => {
        hide();
        invalidatePlan();
      },
      onError: () =>
        toast({
          message: "Couldn't schedule that task. Please try again.",
          variant: "error",
        }),
    })
  );

  const handleDelete = () => {
    if (task.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
      skipOccurrenceMutation.mutate({
        recurrenceId: task.recurrenceId,
        occurrenceDate: task.occurrenceDate,
      });
      return;
    }
    deleteMutation.mutate({ id: task.id });
  };

  const saveTitle = () => {
    const parsed = parseQuickInput(editTitle, { projects: projectRefs });
    const cleanTitle = parsed.title.trim();

    const titleError = getTaskTitleError(parsed.title);
    if (titleError) {
      setEditError(titleError);
      return;
    }
    // An unresolved `#project` shouldn't silently drop — surface it.
    if (parsed.warnings.some((w) => w.code === "project_not_found")) {
      setEditError("No project matches that name — check the spelling.");
      return;
    }
    setEditError(null);

    // Recurring occurrences are virtual: only the title is editable per instance.
    if (task.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
      if (cleanTitle === task.title) {
        setEditing(false);
        setEditTitle(task.title);
        return;
      }
      editOccurrenceMutation.mutate({
        recurrenceId: task.recurrenceId,
        occurrenceDate: task.occurrenceDate,
        patch: { title: cleanTitle },
      });
      return;
    }

    // Grammar only ever sets properties; an absent segment leaves the existing
    // value untouched (never clears it).
    const priority = parsed.priority > 0 ? parsed.priority : undefined;
    const projectId = parsed.projectSlug
      ? (projects.find((p) => p.slug.toLowerCase() === parsed.projectSlug?.toLowerCase())?.id ??
        undefined)
      : undefined;
    const category = parsed.category ?? undefined;
    const tags = parsed.tags.length > 0 ? parsed.tags : undefined;

    const titleChanged = cleanTitle !== task.title;
    if (
      !titleChanged &&
      priority === undefined &&
      projectId === undefined &&
      category === undefined &&
      tags === undefined
    ) {
      setEditing(false);
      setEditTitle(task.title);
      return;
    }

    updateMutation.mutate({
      id: task.id,
      title: cleanTitle,
      priority,
      projectId,
      category,
      tags,
    });
  };

  const handleComplete = () => {
    // Start the choreography immediately; the mutations roll it back on error.
    setCompleting(true);
    if (task.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
      completeOccurrenceMutation.mutate({
        recurrenceId: task.recurrenceId,
        occurrenceDate: task.occurrenceDate,
      });
      return;
    }
    completeMutation.mutate({ id: task.id });
  };

  const isCompleting = completeMutation.isPending || completeOccurrenceMutation.isPending;

  const cancelEdit = () => {
    setEditing(false);
    setEditError(null);
    setEditTitle(task.title);
  };

  const startEdit = () => {
    hide();
    setEditTitle(task.title);
    setEditError(null);
    setEditing(true);
  };

  const dndTransform = CSS.Transform.toString(transform);
  const weekDragWithOverlay = weekDragLift && isDragging && !completing;
  const dragTransform =
    weekDragWithOverlay || completing
      ? undefined
      : weekDragLift && dndTransform && !reducedMotion
        ? `${dndTransform} scale(1.02)`
        : dndTransform;

  return (
    <li
      ref={setRootRef}
      className={`relative overflow-hidden rounded-[var(--radius-card)] ${
        arriveIndex != null ? "row-arrive" : ""
      } ${
        weekDragLift && !isDragging && !completing
          ? "transition-[transform,box-shadow,opacity] duration-short ease-move motion-reduce:transition-opacity motion-reduce:duration-short"
          : ""
      } ${
        completing
          ? "translate-x-6 opacity-0 transition-[transform,opacity] duration-medium ease-exit motion-reduce:translate-x-0 motion-reduce:duration-short"
          : weekDragWithOverlay
            ? "opacity-40"
            : isDragging
              ? "opacity-60"
              : weekDragLift
                ? ""
                : "transition-transform"
      } ${highlightClassName ?? ""}`}
      style={{
        transform: completing ? undefined : dragTransform || undefined,
        ...(arriveIndex != null
          ? {
              animationDelay: `calc(var(--motion-micro) * ${Math.min(arriveIndex, MAX_ARRIVE_STAGGER)})`,
            }
          : undefined),
      }}
    >
      <div ref={containerRef} className="relative">
        {pinEnabled ? (
          <div className="absolute inset-y-0 left-0 flex" aria-hidden={!isLeftOpen}>
            <button
              type="button"
              className="flex w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-card border border-subtle bg-surface text-sm text-accent"
              onClick={(e) => {
                e.stopPropagation();
                hide();
                if (rowContentRef.current) {
                  onPin(task.id, rowContentRef.current);
                }
              }}
            >
              <span aria-hidden>★</span>
              <span>Pin</span>
            </button>
          </div>
        ) : null}

        <div className="absolute inset-y-0 right-0 flex" aria-hidden={!isRightOpen}>
          <button
            type="button"
            className="flex w-[4.5rem] items-center justify-center rounded-card border border-subtle bg-surface text-sm text-ink"
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="flex w-[4.5rem] items-center justify-center rounded-card border border-subtle bg-surface text-sm text-ink-muted"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            {task.isRecurringOccurrence ? "Skip" : "Delete"}
          </button>
        </div>

        <div
          ref={rowContentRef}
          data-task-row={task.id}
          className={`relative flex min-h-[var(--row-min-height)] cursor-pointer items-start gap-2 rounded-card border bg-surface px-3 py-[var(--row-py)] transition-transform duration-short ease-move ${
            isBlocked ? "border-dashed border-ink-faint" : "border-subtle"
          } ${task.isTop3 ? "border-l-2 border-accent" : ""} ${selected ? "ring-2 ring-[var(--accent-soft)]" : ""}`}
          style={{ transform: `translateX(${offset}px)` }}
          onClick={() => onSelect?.(task.id)}
          onDoubleClick={() => onActivate?.(task.id)}
        >
          <span
            className={`mt-0.5 w-[var(--stripe-width)] shrink-0 self-stretch rounded-full${
              task.categoryUnresolved ? "stripe-resolving" : ""
            }`}
            style={{ backgroundColor: stripeColor }}
            aria-label={stripeLabel}
            title={stripeLabel}
          />

          {task.isTop3 ? (
            <span
              className="shrink-0"
              style={{ color: resolvedCategory ? stripeColor : "var(--accent)" }}
              aria-label="Top 3"
            >
              ★
            </span>
          ) : null}

          {task.isRecurringOccurrence ? (
            <div className="relative mt-0.5 shrink-0">
              <button
                type="button"
                className="text-xs text-ink-muted hover:text-ink"
                title={task.recurringLabel ?? "Recurring"}
                aria-label={
                  task.recurringLabel
                    ? `${task.recurringLabel} — recurring occurrence actions`
                    : "Recurring occurrence actions"
                }
                aria-haspopup="menu"
                aria-expanded={occurrenceMenuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setOccurrenceMenuOpen((open) => !open);
                }}
              >
                ↻
              </button>
              {occurrenceMenuOpen && task.recurrenceId && task.occurrenceDate ? (
                <OccurrenceMenu
                  recurrenceId={task.recurrenceId}
                  occurrenceDate={task.occurrenceDate}
                  title={task.title}
                  priority={task.priority}
                  onClose={() => setOccurrenceMenuOpen(false)}
                  onSaved={() => setOccurrenceMenuOpen(false)}
                />
              ) : null}
            </div>
          ) : null}

          <Checkbox
            className="mt-0.5"
            accentColor={completing || resolvedCategory ? stripeColor : "var(--ink)"}
            aria-label={`Complete ${task.title}`}
            checked={completing}
            disabled={isCompleting || isBlocked}
            onClick={(e) => e.stopPropagation()}
            onChange={handleComplete}
          />

          <div className="min-w-0 flex-1">
            {isBlocked && blockerLabel ? (
              <p className="mb-0.5 flex items-center gap-1 text-caption text-ink-faint">
                <LockIcon size={12} className="shrink-0" aria-hidden />
                <span>Waiting on {blockerLabel}</span>
              </p>
            ) : null}
            {editing ? (
              <>
                <ComposerAssistInput
                  value={editTitle}
                  onChange={setEditTitle}
                  config={editAssistConfig}
                  autoFocus
                  aria-invalid={editError != null}
                  wrapperClassName="relative block w-full"
                  className="kash-focus-visible w-full rounded-control border border-border bg-surface px-3 py-1 text-sm text-ink outline-none transition-shadow"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveTitle();
                    }
                    if (e.key === "Escape") {
                      cancelEdit();
                    }
                  }}
                  onBlur={saveTitle}
                />
                {editError ? (
                  <p className="mt-1 text-sm text-critical" role="alert">
                    {editError}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <span
                  className={`block break-words ${
                    completing ? "text-ink-faint line-through" : "text-ink"
                  } ${isOverdue ? "font-medium" : ""}`}
                >
                  {task.title}
                </span>
                {(task.tags?.length ?? 0) > 0 ? (
                  <TaskTagChips tags={task.tags ?? []} className="mt-1" />
                ) : null}
              </>
            )}
          </div>

          {showProjectIndicator && task.projectId ? (
            <Link
              href={`/projects/${task.projectId}`}
              className="mt-0.5 flex max-w-[11rem] shrink-0 items-center gap-1.5 text-xs text-ink-muted underline underline-offset-2 hover:text-accent"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: phaseRampColor(task.projectId, task.phaseSortOrder) }}
                aria-hidden
              />
              <span className="truncate">
                {task.projectName}
                {task.phaseName ? ` · ${task.phaseName}` : ""}
              </span>
            </Link>
          ) : null}

          {suggestion ? (
            <div
              className="mt-0.5 flex shrink-0 items-center gap-1.5 self-start"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="rounded-pill border border-border px-2 py-0.5 text-xs text-ink-muted"
                title={`Suggested for ${suggestion}`}
              >
                {suggestionLabel(suggestion)}
              </span>
              <button
                type="button"
                className="kash-focus-visible rounded-pill border border-accent px-2 py-0.5 text-xs font-medium text-accent transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
                disabled={acceptSuggestedDateMutation.isPending}
                aria-label={`Accept suggested date, schedule for ${suggestion}`}
                onClick={(e) => {
                  e.stopPropagation();
                  acceptSuggestedDateMutation.mutate({ id: task.id });
                }}
              >
                Accept → {suggestionWeekday(suggestion)}
              </button>
            </div>
          ) : null}

          {relativeDue ? (
            <span className={`mt-0.5 shrink-0 self-start text-xs ${dueEmphasisClass}`}>
              {relativeDue.text}
            </span>
          ) : null}

          {activeReveal.priority ? (
            <TaskPriorityIndicator priority={task.priority} reserveSpace />
          ) : null}

          <TaskDragHandle
            ref={setActivatorNodeRef}
            listeners={listeners}
            attributes={dragAttributes}
          />
        </div>
      </div>
    </li>
  );
}
