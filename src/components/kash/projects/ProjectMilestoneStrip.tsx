"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";

import { Circle, CircleCheck, kashIconProps } from "@/components/kash/ui/icon";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

import type { ProjectMilestone } from "./types";

type Props = {
  projectId: string;
  milestones: ProjectMilestone[];
  onEdit: () => void;
  /** Right-aligned control rendered before "Edit" — the board's add (+) button. */
  addSlot?: ReactNode;
  /** Render the strip even with no milestones, so the add button always has a home. */
  alwaysRender?: boolean;
};

function formatMonthDay(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Slim strip of project milestones above the board — dated markers sorted soonest-first. */
export default function ProjectMilestoneStrip({
  projectId,
  milestones,
  onEdit,
  addSlot,
  alwaysRender = false,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const todayIso = toISODateString(startOfLocalDay());
  const [pendingId, setPendingId] = useState<string | null>(null);

  const setComplete = useMutation(
    trpc.projectMilestones.setComplete.mutationOptions({
      onSettled: () => {
        setPendingId(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.projectMilestones.listByProject.queryKey({ projectId }),
        });
      },
    })
  );

  const ordered = useMemo(() => {
    return [...milestones].sort((a, b) => {
      // Undated milestones sink to the end; otherwise soonest date first.
      if (!a.targetDate && !b.targetDate) return a.title.localeCompare(b.title);
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    });
  }, [milestones]);

  if (ordered.length === 0 && !alwaysRender) return null;

  const toggle = (mi: ProjectMilestone) => {
    setPendingId(mi.id);
    setComplete.mutate({ id: mi.id, completed: mi.completedAt === null });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-subtle bg-surface px-3 py-2 shadow-surface">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Milestones</span>
      {ordered.length === 0 ? (
        <span className="text-xs text-ink-faint">None yet</span>
      ) : (
        <ul className="flex flex-wrap items-center gap-1.5">
          {ordered.map((mi) => {
            const done = mi.completedAt !== null;
            const overdue = !done && mi.targetDate !== null && mi.targetDate < todayIso;
            const busy = pendingId === mi.id;
            return (
              <li key={mi.id}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-chip border py-1 pl-1.5 pr-2.5 text-xs ${
                    done
                      ? "border-subtle text-ink-muted"
                      : overdue
                        ? "border-critical/40 text-critical"
                        : "border-subtle text-ink"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(mi)}
                    disabled={busy}
                    aria-pressed={done}
                    aria-label={done ? `Mark "${mi.title}" not done` : `Mark "${mi.title}" done`}
                    title={done ? "Mark not done" : "Mark done"}
                    className={`-my-0.5 flex shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                      busy ? "opacity-40" : "hover:text-ink"
                    }`}
                  >
                    {done ? (
                      <CircleCheck
                        {...kashIconProps({ tokenSize: "sm" })}
                        style={{ color: "var(--action-complete)" }}
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        {...kashIconProps({ tokenSize: "sm", className: "text-ink-faint" })}
                        aria-hidden
                      />
                    )}
                  </button>
                  <span className={`font-medium ${done ? "line-through" : ""}`}>{mi.title}</span>
                  {mi.targetDate ? (
                    <span className={done ? "text-ink-muted line-through" : "text-ink-muted"}>
                      {formatMonthDay(mi.targetDate)}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="ml-auto flex items-center gap-1">
        {addSlot}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-control px-2 py-0.5 text-xs text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
