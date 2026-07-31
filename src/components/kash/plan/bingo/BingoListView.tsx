"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { BingoGoal } from "@/lib/planning/bingo-grid";

type Props = {
  goals: BingoGoal[];
  onSelectGoal: (goal: BingoGoal) => void;
  locked: boolean;
};

function groupGoals(
  goals: BingoGoal[]
): { key: string; label: string; color: string; items: BingoGoal[] }[] {
  return PROJECT_CATEGORIES.map((category) => ({
    key: category,
    label: categorySeedLabel(category),
    color: categorySolidVar(category),
    items: goals.filter((g) => g.category === category && g.cellIndex != null),
  })).filter((g) => g.items.length > 0);
}

/** Dense manage view for bingo goals (ET-5), grouped by category. */
export default function BingoListView({ goals, onSelectGoal, locked }: Props) {
  const groups = groupGoals(goals);

  return (
    <div className="flex flex-col gap-4">
      {groups.length === 0 ? (
        <p className="text-body text-ink-muted">No goals on the card yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-1">
            <h3 className="flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-ink-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: group.color }}
                aria-hidden
              />
              {group.label}
            </h3>
            <ul className="flex flex-col">
              {group.items.map((goal) => (
                <li key={goal.id}>
                  <button
                    type="button"
                    onClick={() => onSelectGoal(goal)}
                    className="flex w-full items-center gap-3 rounded-control px-3 py-1.5 text-left transition hover:bg-surface-2"
                  >
                    <span className="shrink-0 text-ink-faint" aria-hidden>
                      •
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-body ${
                        goal.state === "done" ? "text-ink-muted line-through" : "text-ink"
                      }`}
                    >
                      {goal.title}
                    </span>
                    {locked ? null : (
                      <span className="shrink-0 text-caption text-ink-faint">tap to open</span>
                    )}
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
