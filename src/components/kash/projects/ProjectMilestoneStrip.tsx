"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ChevronRight, Circle, CircleCheck, kashIconProps } from "@/components/kash/ui/icon";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

import type { ProjectMilestone } from "./types";

type Props = {
  projectId: string;
  milestones: ProjectMilestone[];
  /** Control pinned to the header's top-right — the board's add (+) button. */
  addSlot?: ReactNode;
  /** Render the strip even with no milestones, so the add button always has a home. */
  alwaysRender?: boolean;
};

function formatMonthDay(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const collapseKey = (projectId: string) => `kash-milestones-collapsed:${projectId}`;

/** Numbered, collapsible list of project milestones above the board — soonest-first. */
export default function ProjectMilestoneStrip({
  projectId,
  milestones,
  addSlot,
  alwaysRender = false,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const todayIso = toISODateString(startOfLocalDay());
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Default expanded on first paint, then adopt the saved preference after mount
  // (avoids a server/client hydration mismatch on the persisted value).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(window.localStorage.getItem(collapseKey(projectId)) === "1");
  }, [projectId]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        if (next) window.localStorage.setItem(collapseKey(projectId), "1");
        else window.localStorage.removeItem(collapseKey(projectId));
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };

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
    <div className="rounded-card border border-subtle bg-surface px-3 py-2 shadow-surface">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        >
          <ChevronRight
            {...kashIconProps({
              tokenSize: "sm",
              className: `shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`,
              "aria-hidden": true,
            })}
          />
          <span>Milestones</span>
          {ordered.length > 0 ? <span className="text-ink-faint">· {ordered.length}</span> : null}
        </button>
        {addSlot ? <div className="ml-auto flex shrink-0 items-center">{addSlot}</div> : null}
      </div>

      {!collapsed ? (
        ordered.length === 0 ? (
          <p className="mt-1.5 pl-1 text-xs text-ink-faint">None yet</p>
        ) : (
          <ol className="mt-1.5 flex flex-col gap-0.5">
            {ordered.map((mi, index) => {
              const done = mi.completedAt !== null;
              const overdue = !done && mi.targetDate !== null && mi.targetDate < todayIso;
              const busy = pendingId === mi.id;
              return (
                <li key={mi.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                    {index + 1}.
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(mi)}
                    disabled={busy}
                    aria-pressed={done}
                    aria-label={done ? `Mark "${mi.title}" not done` : `Mark "${mi.title}" done`}
                    title={done ? "Mark not done" : "Mark done"}
                    className={`flex shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                      busy ? "opacity-40" : "hover:opacity-80"
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
                  <span
                    className={`min-w-0 flex-1 break-words font-medium ${
                      done ? "text-ink-muted line-through" : overdue ? "text-critical" : "text-ink"
                    }`}
                  >
                    {mi.title}
                  </span>
                  {mi.targetDate ? (
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        done
                          ? "text-ink-muted line-through"
                          : overdue
                            ? "text-critical"
                            : "text-ink-muted"
                      }`}
                    >
                      {formatMonthDay(mi.targetDate)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )
      ) : null}
    </div>
  );
}
