"use client";

import { useEffect, useRef, useState } from "react";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { BingoGoal } from "@/lib/planning/bingo-grid";

type Props = {
  goals: BingoGoal[];
  onSelectGoal: (goal: BingoGoal) => void;
  /** Rename a goal's statement; ignored while the card is locked. */
  onRenameGoal: (goalId: string, title: string) => void;
  locked: boolean;
};

/** Goals are stored normalized (lower-first); the list presents them capitalized. */
function displayTitle(title: string): string {
  return title.charAt(0).toUpperCase() + title.slice(1);
}

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
export default function BingoListView({ goals, onSelectGoal, onRenameGoal, locked }: Props) {
  const groups = groupGoals(goals);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // A single click opens the goal; a double click edits it. Defer the open briefly
  // so the second click of a double-click cancels it instead of popping the panel
  // open mid-edit.
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    },
    []
  );

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const handleRowClick = (goal: BingoGoal) => {
    if (locked) {
      onSelectGoal(goal);
      return;
    }
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      onSelectGoal(goal);
    }, 200);
  };

  const startEdit = (goal: BingoGoal) => {
    if (locked) return;
    clearOpenTimer();
    setDraft(displayTitle(goal.title));
    setEditingId(goal.id);
  };

  const commitEdit = (goal: BingoGoal) => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== displayTitle(goal.title)) {
      onRenameGoal(goal.id, trimmed);
    }
    setEditingId(null);
  };

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
              {group.items.map((goal) =>
                editingId === goal.id ? (
                  <li key={goal.id}>
                    <div className="flex w-full items-center gap-3 rounded-control px-3 py-1.5">
                      <span className="shrink-0 text-2xl leading-none text-ink-faint" aria-hidden>
                        •
                      </span>
                      {/* Borderless inline editor — matches the row, no black outline. */}
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commitEdit(goal)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit(goal);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        className="min-w-0 flex-1 rounded-control bg-surface-2 px-1.5 py-0.5 text-body text-ink outline-none"
                        aria-label={`Edit goal: ${displayTitle(goal.title)}`}
                      />
                    </div>
                  </li>
                ) : (
                  <li key={goal.id}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(goal)}
                      onDoubleClick={() => startEdit(goal)}
                      title={locked ? undefined : "Double-click to edit"}
                      className="flex w-full items-center gap-3 rounded-control px-3 py-1.5 text-left transition hover:bg-surface-2 focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
                    >
                      <span className="shrink-0 text-2xl leading-none text-ink-faint" aria-hidden>
                        •
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-body ${
                          goal.state === "done" ? "text-ink-muted line-through" : "text-ink"
                        }`}
                      >
                        {displayTitle(goal.title)}
                      </span>
                      {locked ? null : (
                        <span className="shrink-0 text-caption text-ink-faint">tap to open</span>
                      )}
                    </button>
                  </li>
                )
              )}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
