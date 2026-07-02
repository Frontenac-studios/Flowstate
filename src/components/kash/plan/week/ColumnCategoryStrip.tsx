"use client";

import { GhostCategoryStrip } from "@/components/kash/ui/GhostCategoryStrip";
import { categorySolidVar, categorySeedLabel } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { computeCategoryBalance } from "@/lib/tasks/category-balance";

import type { PlanTaskRow } from "@/components/kash/plan/TaskRow";

type Props = {
  tasks: PlanTaskRow[];
  /** Ghost tint when the column has no tasks (D20 ~35%). */
  ghostOpacity?: number;
};

/** Persistent five-segment strip in a week column header — ghost pre-data, real tally with tasks. */
export function ColumnCategoryStrip({ tasks, ghostOpacity = 0.35 }: Props) {
  const { segments, totalTasks } = computeCategoryBalance(tasks);

  if (totalTasks === 0) {
    return <GhostCategoryStrip className="mx-auto w-full max-w-[8rem]" opacity={ghostOpacity} />;
  }

  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0) || 1;

  return (
    <div
      className="mx-auto flex h-1.5 w-full max-w-[8rem] overflow-hidden rounded-full"
      role="img"
      aria-label="Day category balance"
    >
      {segments.map((segment) => (
        <span
          key={segment.category ?? "none"}
          className="min-w-[2px] shadow-[0_0_0_1px_var(--mark-ring)]"
          style={{
            flexGrow: segment.weight / totalWeight,
            backgroundColor: segment.category
              ? categorySolidVar(segment.category as ProjectCategory)
              : "var(--ink-faint)",
          }}
          title={`${segment.category ? categorySeedLabel(segment.category as ProjectCategory) : "No category"} · ${segment.taskCount}`}
        />
      ))}
    </div>
  );
}
