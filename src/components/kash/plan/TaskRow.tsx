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
import Checkbox from "@/components/kash/ui/Checkbox";
import SwipeActionRail, { swipeRevealWidth } from "@/components/kash/SwipeActionRail";
import TaskContextMenu from "@/components/kash/TaskContextMenu";
import { Check, Lock, Pencil, SkipForward, Trash2, withKashIcon } from "@/components/kash/ui/icon";
import { TaskTagChips } from "@/components/kash/plan/TaskTagChips";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { useCompletionToast } from "@/hooks/useCompletionToast";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";
import { useRowSwipe } from "@/hooks/useRowSwipe";
import { buildComposerConfig } from "@/lib/parser/composer-assist";
import { parseQuickInput } from "@/lib/parser/parse-quick-input";
import { formatDuePill, type DuePill } from "@/lib/dates/format-due-pill";
import { effectiveDueDate } from "@/lib/tasks/overdue";
import { categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { taskSolidVar } from "@/lib/projects/project-hue";
import { type RevealFlags } from "@/lib/tasks/lens";
import { getTaskTitleError } from "@/lib/taskValidation";
import { onCompleteTaskRequest } from "@/lib/tasks/complete-task-event";
import { MOTION_TOKEN, readMotionDurationMs } from "@/lib/animate/motion-tokens";
import { useTRPC, type RouterOutputs } from "@/trpc/client";

import SuggestedDateChip from "./SuggestedDateChip";

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
  /** Spec v2 — the project's hue (1–8); null for personal / loose tasks. */
  projectHue?: number | null;
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
  /** Spec v5 deadline, separate from the planned day. */
  dueDate?: string | null;
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
  /** Spec v5 DetailA: a single click opens the task detail sheet. */
  onOpenDetail?: (taskId: string) => void;
  /** Double-click / activate — opens the task in focus mode. */
  onActivate?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  /**
   * @deprecated Pin was dropped from the row in PR 4 (D6) — pin now via drag onto
   * Top 3 or ⌘1/2/3. These props are still accepted (callers thread them through
   * onboarding / morning-handoff) but no longer render a row affordance; a
   * follow-up will unwind the caller plumbing.
   */
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
  /**
   * AN §5 / WD7 / Spec v5 DragA: the surface renders a DragOverlay, so while
   * dragging this row stays put as a dashed gap (Week and Today).
   */
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

const REVEAL_WIDTH_PX = swipeRevealWidth(2);
const MAX_ARRIVE_STAGGER = 12;

export function TaskRow({
  task,
  selected = false,
  onSelect,
  onOpenDetail,
  onActivate,
  onComplete,
  onDelete,
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
  const showCompletionToast = useCompletionToast();
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
  // Right-click context menu (D6), positioned at the cursor.
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const rowContentRef = useRef<HTMLDivElement>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarded self-complete, shared by the swipe fling and the ⌘⇧D event. Assigned
  // below once the completion handler + guards exist; a ref keeps the latest
  // closure without re-subscribing the gesture/event listeners each render.
  const completeSelfRef = useRef<() => void>(() => {});
  const runSwipeComplete = useCallback(() => completeSelfRef.current(), []);
  const openDetailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (openDetailTimer.current) clearTimeout(openDetailTimer.current);
    },
    []
  );

  // Clean by default; indicators reveal per active lens (VF-2). The surrounding
  // LensProvider renders clean on the server / first paint, then hydrates from
  // storage — so no hydration mismatch. An explicit `reveal` prop overrides it.
  const lensReveal = useReveal();
  const activeReveal = reveal ?? lensReveal;

  // The project's colour (Spec v2/v5): the dot on the project line, and the tint of
  // the row's hover / selected fill. Loose and personal tasks fall back to the
  // category colour; an unresolved category stays neutral.
  const resolvedCategory = task.category && !task.categoryUnresolved ? task.category : null;
  const stripeColor = resolvedCategory
    ? taskSolidVar({ category: resolvedCategory, projectHue: task.projectHue })
    : NEUTRAL_CATEGORY_STRIPE;
  const stripeLabel = resolvedCategory
    ? (task.projectName ?? categoryLabel(resolvedCategory))
    : "No category yet";

  // Spec v2/v5: overdue and due-today pills always show; a future date is plain
  // muted text and only under the due lens. Day-grouped surfaces suppress it.
  // Spec v5: the deadline when set, else the planned day.
  const duePill = suppressDue ? null : formatDuePill(effectiveDueDate(task));
  const shownDue = duePill && (duePill.tone !== "muted" || activeReveal.due) ? duePill : null;
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
  // Spec v5: the project line (dot + name) is always on — it replaces the stripe.
  // Loose tasks show their category instead.
  const showProjectLine = Boolean(showProject && resolvedCategory);
  const { revealOffset, flingOffset, isRevealOpen, hide, consumeSwipe, containerRef } = useRowSwipe(
    {
      revealWidth: REVEAL_WIDTH_PX,
      onSwipeComplete: runSwipeComplete,
    }
  );

  /** Snapped rather than live — the rail flips open past the halfway point. */
  const actionRailOpen = revealOffset >= REVEAL_WIDTH_PX / 2;

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
      disabled: editing || isRevealOpen,
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
              projectHue: task.projectHue ?? null,
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
        showCompletionToast(task);
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
        showCompletionToast(task);
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

  // Shared by the swipe-right fling and D5's `Cmd+Shift+D` event: run the row's
  // own `handleComplete` (so the slide-out + occurrence branching stay identical),
  // guarded against firing while already completing or blocked.
  completeSelfRef.current = () => {
    if (isCompleting || completing || isBlocked) return;
    handleComplete();
  };
  useEffect(
    () =>
      onCompleteTaskRequest((taskId) => {
        if (taskId === task.id) completeSelfRef.current();
      }),
    [task.id]
  );

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
      className={`kash-tint-scope relative grid overflow-hidden rounded-row ${
        completing ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      } ${arriveIndex != null ? "row-arrive" : ""} ${
        weekDragLift && !isDragging && !completing
          ? "transition-[transform,box-shadow,opacity] duration-short ease-move motion-reduce:transition-opacity motion-reduce:duration-short"
          : ""
      } ${
        completing
          ? // Collapse the row's height (grid 1fr→0fr) alongside the slide-out so
            // rows below rise smoothly and stay top-aligned, instead of snapping up
            // when the deferred refetch finally unmounts this row. `!mt-0` drops the
            // `space-y-2` gap this row contributes so the collapse closes fully.
            "!mt-0 translate-x-6 opacity-0 transition-[grid-template-rows,transform,opacity,margin] duration-medium ease-exit motion-reduce:translate-x-0 motion-reduce:duration-short"
          : weekDragWithOverlay
            ? // Spec v5 DragA: the row lifts into the overlay; its slot stays open
              // as a dashed gap.
              "outline-dashed outline-[1.5px] -outline-offset-2 outline-outline-border [&>*]:invisible"
            : isDragging
              ? "opacity-60"
              : weekDragLift
                ? ""
                : "transition-transform"
      } ${highlightClassName ?? ""}`}
      style={{
        ["--tint" as string]: stripeColor,
        transform: completing ? undefined : dragTransform || undefined,
        ...(arriveIndex != null
          ? {
              animationDelay: `calc(var(--motion-micro) * ${Math.min(arriveIndex, MAX_ARRIVE_STAGGER)})`,
            }
          : undefined),
      }}
    >
      <div ref={containerRef} className="relative min-h-0 touch-pan-y overflow-hidden rounded-row">
        {/* Complete-tone hint revealed under the row as it flings right (D1). */}
        {flingOffset > 0 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-0 flex items-center rounded-row pl-3"
            style={{
              width: flingOffset,
              backgroundColor: "color-mix(in srgb, var(--action-complete) 14%, transparent)",
            }}
          >
            <Check size={18} className="text-[var(--action-complete)]" aria-hidden />
          </div>
        ) : null}
        <div
          ref={rowContentRef}
          data-task-row={task.id}
          className={`relative flex min-h-12 cursor-pointer items-center gap-3 overflow-hidden rounded-row px-2 py-1.5 transition-[transform,background-color] duration-short ease-move motion-reduce:transition-none ${
            selected ? "bg-tint-pressed" : "bg-surface hover:bg-tint-hover"
          } ${isBlocked ? "border-l-2 border-dashed border-ink-faint" : ""}`}
          style={flingOffset > 0 ? { transform: `translateX(${flingOffset}px)` } : undefined}
          onClick={(e) => {
            // A pointer swipe ends in a click — suppress the select it would fire.
            if (consumeSwipe()) return;
            onSelect?.(task.id);
            // Open the detail sheet on a single click only: wait out the
            // double-click window so a double-click still goes to focus mode.
            // Recurring occurrences are virtual rows with no task to open.
            if (onOpenDetail && !task.isRecurringOccurrence && e.detail === 1) {
              if (openDetailTimer.current) clearTimeout(openDetailTimer.current);
              openDetailTimer.current = setTimeout(() => onOpenDetail(task.id), 220);
            }
          }}
          onDoubleClick={() => {
            if (openDetailTimer.current) clearTimeout(openDetailTimer.current);
            onActivate?.(task.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            hide();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <TaskDragHandle
            ref={setActivatorNodeRef}
            listeners={listeners}
            attributes={dragAttributes}
          />

          <Checkbox
            round
            className="!size-5"
            checked={completing}
            disabled={isBlocked || completing}
            aria-label={`Complete ${task.title}`}
            onClick={(e) => e.stopPropagation()}
            onChange={() => completeSelfRef.current()}
          />

          {task.isTop3 ? (
            <span className="shrink-0" style={{ color: "var(--accent)" }} aria-label="Top 3">
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

          <div className="min-w-0 flex-1">
            {isBlocked && blockerLabel ? (
              <p className="mb-0.5 flex items-center gap-1 text-caption text-ink-muted">
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
                  className={`block break-words text-body font-medium leading-snug ${
                    completing ? "text-ink-faint line-through" : "text-ink"
                  }`}
                >
                  {task.title}
                </span>
                {showProjectLine ? (
                  <ProjectLine
                    projectId={task.projectId}
                    label={
                      task.projectName
                        ? `${task.projectName}${task.phaseName ? ` · ${task.phaseName}` : ""}`
                        : stripeLabel
                    }
                    color={stripeColor}
                  />
                ) : null}
              </>
            )}
          </div>

          {suggestion ? (
            <SuggestedDateChip
              taskId={task.id}
              suggestedScheduledDate={suggestion}
              onAccepted={() => {
                hide();
                invalidatePlan();
              }}
              onError={() =>
                toast({
                  message: "Couldn't schedule that task. Please try again.",
                  variant: "error",
                })
              }
            />
          ) : null}

          {/* Spec v3/v5: coloured tags sit on the right, before the due pill. */}
          <TaskTagChips tags={task.tags ?? []} maxVisible={2} className="shrink-0" />

          {shownDue ? <DueChip due={shownDue} /> : null}

          {/* Spec v2: only High is marked, so it is never lens-gated. */}
          <TaskPriorityIndicator priority={task.priority} />

          <SwipeActionRail
            open={actionRailOpen}
            className="-my-1.5 -mr-2"
            actions={[
              {
                key: "edit",
                label: "Edit",
                icon: Pencil,
                tone: "edit",
                onClick: (e) => {
                  e.stopPropagation();
                  startEdit();
                },
              },
              {
                key: "remove",
                label: task.isRecurringOccurrence ? "Skip this occurrence" : "Delete",
                icon: task.isRecurringOccurrence ? SkipForward : Trash2,
                tone: task.isRecurringOccurrence ? "neutral" : "danger",
                onClick: (e) => {
                  e.stopPropagation();
                  handleDelete();
                },
              },
            ]}
          />
        </div>
      </div>
      {contextMenu ? (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          completed={false}
          isRecurringOccurrence={task.isRecurringOccurrence ?? false}
          onComplete={() => completeSelfRef.current()}
          onEdit={startEdit}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </li>
  );
}

/** Spec v5 second line: the project's dot + name (or the category, for loose tasks). */
function ProjectLine({
  projectId,
  label,
  color,
}: {
  projectId: string | null;
  label: string;
  color: string;
}) {
  const content = (
    <>
      <span
        className="size-1.5 shrink-0 rounded-pill"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </>
  );
  const className = "mt-0.5 flex max-w-full items-center gap-1.5 text-caption text-ink-muted";
  return projectId ? (
    <Link
      href={`/projects/${projectId}`}
      className={`${className} w-fit hover:text-ink hover:underline`}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

/** Overdue = crimson on soft crimson, today = ink on soft gray, future = muted text. */
function DueChip({ due }: { due: DuePill }) {
  if (due.tone === "muted") {
    return <span className="shrink-0 text-caption text-[var(--due-future)]">{due.text}</span>;
  }
  return (
    <span
      className={`shrink-0 rounded-pill px-2.5 py-0.5 text-caption font-semibold ${
        due.tone === "overdue" ? "bg-critical-soft text-critical" : "bg-active-surface text-ink"
      }`}
    >
      {due.text}
    </span>
  );
}
