"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import Input from "@/components/kash/ui/Input";
import { PRIORITY_LEVELS, priorityMeta } from "@/lib/tasks/priority";
import { getTaskTitleError } from "@/lib/taskValidation";
import { useTRPC } from "@/trpc/client";

type Props = {
  recurrenceId: string;
  occurrenceDate: string;
  title: string;
  priority: number;
  onClose: () => void;
  onSaved?: () => void;
};

const MENU_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

type Step = "menu" | "edit" | "reschedule";

/**
 * Per-occurrence actions for recurring plan rows: edit-this, skip, reschedule.
 * Edit-this patches title/priority via `recurrence.editOccurrence`; the series rule
 * is untouched (contrast TaskRepeatSection's edit-all-future picker).
 */
export default function OccurrenceMenu({
  recurrenceId,
  occurrenceDate,
  title,
  priority,
  onClose,
  onSaved,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("menu");
  const [editTitle, setEditTitle] = useState(title);
  const [editPriority, setEditPriority] = useState(priority);
  const [editError, setEditError] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(occurrenceDate);

  const invalidatePlan = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listRecentlyCompleted.queryKey() });
    void queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());
  };

  const skipMutation = useMutation(
    trpc.recurrence.skipOccurrence.mutationOptions({
      onSuccess: () => {
        invalidatePlan();
        onSaved?.();
        onClose();
      },
    })
  );

  const editMutation = useMutation(
    trpc.recurrence.editOccurrence.mutationOptions({
      onSuccess: () => {
        invalidatePlan();
        onSaved?.();
        onClose();
      },
    })
  );

  const rescheduleMutation = useMutation(
    trpc.recurrence.rescheduleOccurrence.mutationOptions({
      onSuccess: () => {
        invalidatePlan();
        onSaved?.();
        onClose();
      },
    })
  );

  const busy = skipMutation.isPending || editMutation.isPending || rescheduleMutation.isPending;

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const saveEdit = () => {
    const trimmed = editTitle.trim();
    const titleError = getTaskTitleError(editTitle);
    if (titleError) {
      setEditError(titleError);
      return;
    }
    const patch: { title?: string; priority?: number } = {};
    if (trimmed !== title) patch.title = trimmed;
    if (editPriority !== priority) patch.priority = editPriority;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setEditError(null);
    editMutation.mutate({ recurrenceId, occurrenceDate, patch });
  };

  const saveReschedule = () => {
    if (!rescheduleDate || rescheduleDate === occurrenceDate) {
      onClose();
      return;
    }
    rescheduleMutation.mutate({
      recurrenceId,
      occurrenceDate,
      movedToDate: rescheduleDate,
    });
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Recurring occurrence actions for ${title}`}
      className="absolute right-0 top-8 z-overlay w-56 rounded-card border border-border bg-surface p-1.5 shadow-overlay"
    >
      {step === "menu" ? (
        <>
          <p className="px-2 pb-1 text-caption text-ink-faint">
            This occurrence only — series unchanged
          </p>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => setStep("edit")}
            className={`flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
          >
            Edit this occurrence
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => skipMutation.mutate({ recurrenceId, occurrenceDate })}
            className={`flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
          >
            {skipMutation.isPending ? "Skipping…" : "Skip"}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => setStep("reschedule")}
            className={`flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
          >
            Reschedule
          </button>
        </>
      ) : null}

      {step === "edit" ? (
        <div className="flex flex-col gap-2 px-1 py-1">
          <p className="text-caption text-ink-faint">Edit this occurrence only</p>
          <Input
            type="text"
            className="w-full text-sm"
            value={editTitle}
            autoFocus
            aria-invalid={editError != null}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit();
              }
            }}
          />
          {editError ? (
            <p className="text-caption text-critical" role="alert">
              {editError}
            </p>
          ) : null}
          <div
            className="flex w-full rounded-pill border border-border bg-surface text-xs"
            role="group"
            aria-label="Priority"
          >
            {PRIORITY_LEVELS.map((p) => {
              const meta = priorityMeta(p);
              const selected = editPriority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEditPriority(p)}
                  aria-pressed={selected}
                  className={`flex-1 rounded-full px-2 py-1 transition ${
                    selected ? "text-on-accent bg-accent" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={saveEdit}
              className={`flex-1 rounded-control px-2 py-1.5 text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
            >
              {editMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => setStep("menu")}
              className={`flex-1 rounded-control px-2 py-1.5 text-body text-ink-muted transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
            >
              Back
            </button>
          </div>
        </div>
      ) : null}

      {step === "reschedule" ? (
        <div className="flex flex-col gap-2 px-1 py-1">
          <p className="text-caption text-ink-faint">Move this occurrence to</p>
          <Input
            type="date"
            className="w-full text-sm"
            value={rescheduleDate}
            autoFocus
            onChange={(e) => setRescheduleDate(e.target.value)}
          />
          <div className="flex gap-1">
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={saveReschedule}
              className={`flex-1 rounded-control px-2 py-1.5 text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
            >
              {rescheduleMutation.isPending ? "Moving…" : "Move"}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => setStep("menu")}
              className={`flex-1 rounded-control px-2 py-1.5 text-body text-ink-muted transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
            >
              Back
            </button>
          </div>
        </div>
      ) : null}

      {skipMutation.isError || editMutation.isError || rescheduleMutation.isError ? (
        <p className="px-2 py-1 text-caption text-critical">Something went wrong — try again.</p>
      ) : null}
    </div>
  );
}
