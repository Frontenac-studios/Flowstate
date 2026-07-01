"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useTRPC } from "@/trpc/client";

type Props = {
  activity: { id: string; title: string };
  onClose: () => void;
  /** Open the shared create/edit dialog for this practice. */
  onEdit: () => void;
  /** Flash a confirmation on the row after a task is spawned. */
  onAddedToDay: () => void;
};

const MENU_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

/**
 * The per-row ⋯ menu: Add to my day · Edit · Remove. Owns the add-to-day and
 * archive mutations (Edit defers to the shared dialog via `onEdit`). Remove uses
 * an inline confirm step rather than a separate dialog so it survives the menu's
 * own outside-click close. Dismisses on outside-click or Escape.
 */
export default function PracticeMenu({ activity, onClose, onEdit, onAddedToDay }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const addToMyDay = useMutation(
    trpc.care.addToMyDay.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listToday.queryKey() });
        onAddedToDay();
        onClose();
      },
    })
  );

  const archive = useMutation(
    trpc.care.archiveActivity.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.listActivities.queryKey() });
        // Archiving an adopted practice frees its seed key back into the catalog.
        void queryClient.invalidateQueries({ queryKey: trpc.care.catalog.queryKey() });
        onClose();
      },
    })
  );

  const busy = addToMyDay.isPending || archive.isPending;

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

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${activity.title}`}
      className="absolute right-0 top-8 z-overlay w-52 rounded-card border border-border bg-surface p-1.5 shadow-overlay"
    >
      {confirmingRemove ? (
        <>
          <p className="px-2 pb-1.5 pt-1 text-caption text-ink-faint">
            Remove from your list? Your check-ins are kept.
          </p>
          <div className="flex gap-1 px-1 pb-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => archive.mutate({ id: activity.id })}
              disabled={busy}
              className={`flex-1 rounded-control px-2 py-1.5 text-body text-critical transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
            >
              {archive.isPending ? "Removing…" : "Remove"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy}
              className={`flex-1 rounded-control px-2 py-1.5 text-body text-ink-muted transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => addToMyDay.mutate({ activityId: activity.id })}
            disabled={busy}
            className={`flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
          >
            {addToMyDay.isPending ? "Adding…" : "Add to my day"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onEdit}
            disabled={busy}
            className="flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            className={`flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink-muted transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
          >
            Remove
          </button>
        </>
      )}
      {addToMyDay.isError || archive.isError ? (
        <p className="px-2 py-1 text-caption text-critical">Something went wrong — try again.</p>
      ) : null}
    </div>
  );
}
