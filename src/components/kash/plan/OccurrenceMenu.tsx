"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type KeyboardEvent } from "react";

import Input from "@/components/kash/ui/Input";
import Menu, { MenuItem } from "@/components/kash/ui/Menu";
import { useDismiss } from "@/hooks/useDismiss";
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

type Step = "menu" | "edit" | "reschedule";

const MENU_NAV_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

/**
 * The edit/reschedule steps hold text and date inputs, where arrows and Home/End
 * edit the value; keep those keys from reaching the Menu's roving focus.
 */
const keepInputKeys = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.target instanceof HTMLInputElement && MENU_NAV_KEYS.has(e.key)) e.stopPropagation();
};

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

  useDismiss(true, [ref], onClose);

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
    <Menu
      ref={ref}
      aria-label={`Recurring occurrence actions for ${title}`}
      className="absolute right-0 top-full mt-1 w-56"
    >
      {step === "menu" ? (
        <>
          <p className="px-3 pb-1 pt-1 text-caption text-ink-muted">
            This occurrence only — series unchanged
          </p>
          <MenuItem disabled={busy} onClick={() => setStep("edit")}>
            Edit this occurrence
          </MenuItem>
          <MenuItem
            disabled={busy}
            onClick={() => skipMutation.mutate({ recurrenceId, occurrenceDate })}
          >
            {skipMutation.isPending ? "Skipping…" : "Skip"}
          </MenuItem>
          <MenuItem disabled={busy} onClick={() => setStep("reschedule")}>
            Reschedule
          </MenuItem>
        </>
      ) : null}

      {step === "edit" ? (
        <div className="flex flex-col gap-2 px-1 py-1" onKeyDown={keepInputKeys}>
          <p className="text-caption text-ink-muted">Edit this occurrence only</p>
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
            <MenuItem disabled={busy} onClick={saveEdit} className="flex-1 text-center">
              {editMutation.isPending ? "Saving…" : "Save"}
            </MenuItem>
            <MenuItem
              disabled={busy}
              onClick={() => setStep("menu")}
              className="flex-1 text-center !text-ink-muted"
            >
              Back
            </MenuItem>
          </div>
        </div>
      ) : null}

      {step === "reschedule" ? (
        <div className="flex flex-col gap-2 px-1 py-1" onKeyDown={keepInputKeys}>
          <p className="text-caption text-ink-muted">Move this occurrence to</p>
          <Input
            type="date"
            className="w-full text-sm"
            value={rescheduleDate}
            autoFocus
            onChange={(e) => setRescheduleDate(e.target.value)}
          />
          <div className="flex gap-1">
            <MenuItem disabled={busy} onClick={saveReschedule} className="flex-1 text-center">
              {rescheduleMutation.isPending ? "Moving…" : "Move"}
            </MenuItem>
            <MenuItem
              disabled={busy}
              onClick={() => setStep("menu")}
              className="flex-1 text-center !text-ink-muted"
            >
              Back
            </MenuItem>
          </div>
        </div>
      ) : null}

      {skipMutation.isError || editMutation.isError || rescheduleMutation.isError ? (
        <p className="px-3 py-1 text-caption text-critical">Something went wrong — try again.</p>
      ) : null}
    </Menu>
  );
}
