"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { flattenPlanOutline, type PlanOutlineRow } from "@/lib/projects/flatten-plan-outline";
import type { ProjectTree } from "@/lib/projects/phase-tree";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import type { ProjectPhase, ProjectTask } from "./types";

type Props = {
  projectId: string;
  category: ProjectCategory;
  tree: ProjectTree<ProjectPhase, ProjectTask>;
};

function formatDue(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatHours(value: number | null): string {
  return value === null ? "—" : `${value}h`;
}

const EMPTY = "text-[color:var(--ink-faint)] opacity-60";

/**
 * Plan mode — the whole tree at once, with dates and hours in fixed columns
 * (Kash 3.2, decision 2D).
 *
 * This is the read-only half of the build: the outline as a *view*, so the board and
 * the outline can be confirmed to agree before the planning flow is bet on it. The
 * editable half — Tab to indent, Shift+Tab to outdent, inline dates — lands next and
 * reuses `flattenPlanOutline` unchanged.
 *
 * Two things it already does that the board could not. Estimate and logged sit on the
 * same row, so "12h estimated against 14h logged" is legible without opening the burn
 * panel below the fold. And a phase with no end date says so, rather than being
 * silently absent from the calendar.
 */
export default function PlanOutline({ projectId, category, tree }: Props) {
  const trpc = useTRPC();

  const { data: rollups } = useQuery(trpc.projects.getTimeRollups.queryOptions({ projectId }));
  const { data: burnReads = [] } = useQuery(trpc.projects.burn.queryOptions({ projectId }));

  const hotPhaseIds = useMemo(() => {
    const burn = burnReads.find((read) => read.projectId === projectId)?.burn;
    return new Set(
      (burn?.phases ?? []).filter((p) => p.burn.state === "hot").map((p) => p.phaseId)
    );
  }, [burnReads, projectId]);

  const rows = useMemo<PlanOutlineRow[]>(
    () =>
      flattenPlanOutline({
        tree,
        secondsByPhaseId: rollups?.byPhaseId ?? {},
        secondsByTaskId: rollups?.byTaskId ?? {},
        hotPhaseIds,
      }),
    [tree, rollups, hotPhaseIds]
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-center">
        <p className="text-body text-ink-muted">Nothing planned yet.</p>
        <p className="mt-1 text-caption text-ink-faint">
          Add phases and tasks on the Columns view, then come back here to see the whole shape.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[560px] border-collapse text-body">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th scope="col" className="px-3 py-2 text-left text-caption font-normal text-ink-faint">
              Phase and tasks
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              Due
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              Est
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              Logged
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isPhase = row.kind === "phase";
            return (
              <tr key={`${row.kind}-${row.id}`} className="border-b border-subtle last:border-b-0">
                <td className="px-3 py-1.5">
                  <span
                    className="flex min-h-[26px] items-center gap-2"
                    style={{ paddingLeft: `${row.depth * 22}px` }}
                  >
                    {isPhase ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: categorySolidVar(category),
                          boxShadow: "0 0 0 1px var(--mark-ring)",
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`truncate ${isPhase ? "font-medium text-ink" : "text-ink-muted"} ${
                        row.completed ? "line-through opacity-60" : ""
                      }`}
                    >
                      {row.title}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-meta text-ink-muted">
                  {row.due ? (
                    formatDue(row.due)
                  ) : isPhase ? (
                    <span className={EMPTY}>set end</span>
                  ) : (
                    <span className={EMPTY}>—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-meta text-ink-muted">
                  {row.estimateHours === null ? (
                    <span className={EMPTY}>—</span>
                  ) : (
                    formatHours(row.estimateHours)
                  )}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-1.5 text-right text-meta ${
                    row.hot ? "text-critical" : "text-ink-faint"
                  }`}
                >
                  {row.actualHours === null ? (
                    <span className={EMPTY}>—</span>
                  ) : (
                    formatHours(row.actualHours)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
