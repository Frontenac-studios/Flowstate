"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Checkbox from "@/components/kash/ui/Checkbox";
import { MoreHorizontal, kashIconProps } from "@/components/kash/ui/icon";
import IconButton from "@/components/kash/ui/IconButton";
import { cadenceLabel } from "@/lib/care/labels";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/client";

import PracticeMenu from "./PracticeMenu";

type CareActivity = RouterOutputs["care"]["listActivities"][number];

type Props = {
  activity: CareActivity;
  /** Whether this practice has a check-off logged today (from recentEvents). */
  doneToday: boolean;
  /** Open the shared create/edit dialog for this practice. */
  onEdit: (activity: CareActivity) => void;
};

export default function PracticeRow({ activity, doneToday, onEdit }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  // Optimistic check-off: reflect the click immediately, reconcile when the
  // recentEvents query catches up (or revert on error).
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const checked = optimistic ?? doneToday;
  const hint = cadenceLabel(activity.cadence);

  useEffect(() => {
    setOptimistic(null);
  }, [doneToday]);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 2500);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const invalidateRecent = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.care.recentEvents.queryKey() });
  };

  const logEvent = useMutation(
    trpc.care.logEvent.mutationOptions({
      onSuccess: invalidateRecent,
      onError: () => setOptimistic(null),
    })
  );
  const unlogEvent = useMutation(
    trpc.care.unlogEvent.mutationOptions({
      onSuccess: invalidateRecent,
      onError: () => setOptimistic(null),
    })
  );

  const togglePending = logEvent.isPending || unlogEvent.isPending;

  const handleToggle = () => {
    const next = !checked;
    setOptimistic(next);
    if (next) {
      logEvent.mutate({ activityId: activity.id });
    } else {
      unlogEvent.mutate({ activityId: activity.id });
    }
  };

  return (
    <div className="relative flex items-center gap-3 rounded-row px-2 py-1.5 hover:bg-surface-2">
      <Checkbox
        checked={checked}
        disabled={togglePending}
        onChange={handleToggle}
        aria-label={`Mark "${activity.title}" done today`}
      />

      <div className="min-w-0 flex-1">
        <p className={`truncate text-body ${checked ? "text-ink-muted line-through" : "text-ink"}`}>
          {activity.title}
        </p>
        {justAdded ? (
          <p className="text-caption text-ink-faint">Added to your day ✓</p>
        ) : hint ? (
          <p className="text-caption text-ink-faint">{hint}</p>
        ) : null}
      </div>

      <IconButton
        type="button"
        aria-label={`Actions for ${activity.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MoreHorizontal {...kashIconProps({ tokenSize: "md" })} aria-hidden />
      </IconButton>

      {menuOpen ? (
        <PracticeMenu
          activity={activity}
          onClose={() => setMenuOpen(false)}
          onEdit={() => {
            setMenuOpen(false);
            onEdit(activity);
          }}
          onAddedToDay={() => setJustAdded(true)}
        />
      ) : null}
    </div>
  );
}
