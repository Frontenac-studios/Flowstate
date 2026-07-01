"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { BingoGoal } from "@/lib/planning/bingo-grid";

export type BingoListGroupBy = "category" | "status";

type Props = {
  goals: BingoGoal[];
  groupBy: BingoListGroupBy;
  onGroupByChange: (value: BingoListGroupBy) => void;
  onSelectGoal: (goal: BingoGoal) => void;
  locked: boolean;
};

function statusLabel(state: BingoGoal["state"]): string {
  if (state === "done") return "Done";
  if (state === "backburnered") return "Paused";
  return "Active";
}

function groupGoals(
  goals: BingoGoal[],
  groupBy: BingoListGroupBy
): { key: string; label: string; color?: string; items: BingoGoal[] }[] {
  if (groupBy === "category") {
    return PROJECT_CATEGORIES.map((category) => ({
      key: category,
      label: categorySeedLabel(category),
      color: categorySolidVar(category),
      items: goals.filter((g) => g.category === category && g.cellIndex != null),
    })).filter((g) => g.items.length > 0);
  }

  const order: BingoGoal["state"][] = ["active", "done", "backburnered"];
  return order
    .map((state) => ({
      key: state,
      label: statusLabel(state),
      items: goals.filter((g) => g.state === state && g.cellIndex != null),
    }))
    .filter((g) => g.items.length > 0);
}

/** Dense manage view for bingo goals (ET-5). */
export default function BingoListView({
  goals,
  groupBy,
  onGroupByChange,
  onSelectGoal,
  locked,
}: Props) {
  const groups = groupGoals(goals, groupBy);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-caption">
        <span className="text-ink-muted">Group by</span>
        <button
          type="button"
          aria-pressed={groupBy === "category"}
          onClick={() => onGroupByChange("category")}
          className={`rounded-control border px-2.5 py-1 font-medium transition ${
            groupBy === "category"
              ? "border-ink bg-surface-2 text-ink"
              : "border-subtle text-ink-muted hover:text-ink"
          }`}
        >
          Category
        </button>
        <button
          type="button"
          aria-pressed={groupBy === "status"}
          onClick={() => onGroupByChange("status")}
          className={`rounded-control border px-2.5 py-1 font-medium transition ${
            groupBy === "status"
              ? "border-ink bg-surface-2 text-ink"
              : "border-subtle text-ink-muted hover:text-ink"
          }`}
        >
          Status
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-body text-ink-muted">No goals on the card yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-ink-muted">
              {group.color ? (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                />
              ) : null}
              {group.label}
            </h3>
            <ul className="flex flex-col gap-1">
              {group.items.map((goal) => (
                <li key={goal.id}>
                  <button
                    type="button"
                    onClick={() => onSelectGoal(goal)}
                    className="flex w-full items-center justify-between gap-3 rounded-control border border-subtle bg-surface px-3 py-2 text-left transition hover:bg-surface-2"
                  >
                    <span
                      className={`min-w-0 flex-1 truncate text-body ${
                        goal.state === "done" ? "text-ink-muted line-through" : "text-ink"
                      }`}
                    >
                      {goal.title}
                    </span>
                    <span className="shrink-0 text-caption text-ink-faint">
                      {goal.cellIndex != null ? `#${goal.cellIndex + 1}` : ""}
                      {locked ? "" : " · tap to open"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
