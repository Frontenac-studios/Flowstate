"use client";

import Link from "next/link";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";

export type ProjectStatusRow = {
  id: string;
  name: string;
  category: ProjectCategory;
  state: "prospect" | "active" | "paused" | "done";
  percent: number;
  taskCount: number;
  clientName: string | null;
  nextDueDate: string | null;
  /** Hours logged. Always known. */
  actualHours: number;
  /** Hours estimated, or null when nothing on the project carries an estimate. */
  estimateHours: number | null;
  /** True when the budget is running ahead of the work. */
  hot: boolean;
};

const STATE_LABEL: Record<ProjectStatusRow["state"], string> = {
  prospect: "Prospect",
  active: "Active",
  paused: "Paused",
  done: "Done",
};

/** "Sep 5" — short, no year, because everything here is near-term. */
function formatDueDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatHours(value: number): string {
  return `${Math.round(value * 10) / 10}h`;
}

/**
 * The Projects index as a status view (Kash 3.2, decision 6B).
 *
 * MISSION forbids a dashboard, and this is the narrow amendment rather than a breach
 * of it: numbers appear at the Projects altitude, because you come here *in order to*
 * compare projects. Nothing here leaks onto Today.
 *
 * Every figure is already computed elsewhere — this is layout over `projects.list`
 * and `projects.burn`, not new aggregation.
 */
export default function ProjectsStatusTable({ rows }: { rows: ProjectStatusRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-body">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th scope="col" className="px-3 py-2 text-left text-caption font-normal text-ink-faint">
              Project
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              Done
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              Budget
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              Next
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-caption font-normal text-ink-faint"
            >
              State
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="py-0 pl-0 pr-3">
                <Link
                  href={`/projects/${row.id}`}
                  className="kash-focus-visible flex min-h-[30px] items-center gap-2 py-1.5 pl-3 text-ink"
                  style={{
                    borderLeft: `var(--stripe-width) solid ${categorySolidVar(row.category)}`,
                  }}
                >
                  <span className="truncate">{row.name}</span>
                  {row.clientName ? (
                    <span className="shrink-0 text-caption text-ink-faint">{row.clientName}</span>
                  ) : null}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right text-meta text-ink-muted">
                {row.taskCount > 0 ? `${row.percent}%` : "—"}
              </td>
              <td
                className={`whitespace-nowrap px-3 py-1.5 text-right text-meta ${
                  row.hot ? "text-critical" : "text-ink-muted"
                }`}
              >
                {row.estimateHours !== null
                  ? `${formatHours(row.actualHours)} of ${formatHours(row.estimateHours)}`
                  : row.actualHours > 0
                    ? formatHours(row.actualHours)
                    : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right text-meta text-ink-muted">
                {row.nextDueDate ? formatDueDate(row.nextDueDate) : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right text-meta text-ink-muted">
                {STATE_LABEL[row.state]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
