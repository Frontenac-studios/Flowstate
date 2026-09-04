"use client";

import { useMemo, useState } from "react";

import { rankResults, type RankableResult } from "@/lib/search/rank-results";

type FinderTask = {
  id: string;
  title: string;
  phaseId: string | null;
  completedAt: Date | null;
  /**
   * The board's task rows don't carry one, and it is only the ranking tiebreak.
   * Without it, order falls back to match quality and then title — deterministic,
   * and inside a single project recency was never doing much work anyway.
   */
  updatedAt?: Date | null;
};

/** Below this a query matches most of the board, which is not finding. */
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 6;

/**
 * Find a task inside one project (W17f).
 *
 * This filters the tasks the board already loaded rather than asking the server:
 * a project holds tens of tasks, they are in memory, and a round trip per
 * keystroke would be slower than the filter it replaced. It shares the ranking
 * with global search so a title match beats a mid-word one here too.
 *
 * Picking a result selects its phase path, which is what "reveal" means on a
 * Miller board — the columns walk down to it and the task is on screen.
 */
export function ProjectTaskFinder({
  tasks,
  phaseName,
  onReveal,
}: {
  tasks: FinderTask[];
  /** Human name for a phase id, for the one line of orientation each row gets. */
  phaseName: (phaseId: string | null) => string | null;
  onReveal: (task: FinderTask) => void;
}) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) return [];

    const needle = q.toLowerCase();
    const rankable = tasks
      .filter((task) => task.title.toLowerCase().includes(needle))
      .map((task) => ({
        id: task.id,
        kind: "task" as const,
        title: task.title,
        matchField: "title" as const,
        done: task.completedAt !== null,
        updatedAt: task.updatedAt ?? new Date(0),
        task,
      }));

    return rankResults<RankableResult & { task: FinderTask }>(rankable, q, RESULT_LIMIT);
  }, [tasks, query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
          if (e.key === "Enter" && matches[0]) {
            onReveal(matches[0].task);
            setQuery("");
          }
        }}
        placeholder="Find a task in this project…"
        aria-label="Find a task in this project"
        className="w-full rounded-control border border-subtle bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] sm:max-w-xs"
      />

      {query.trim().length >= MIN_QUERY_LENGTH ? (
        <ul
          className="absolute z-sticky mt-1 w-full overflow-hidden rounded-card border border-border bg-surface shadow-overlay sm:max-w-xs"
          role="listbox"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">Nothing by that name here</li>
          ) : (
            matches.map((match) => (
              <li key={match.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    onReveal(match.task);
                    setQuery("");
                  }}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-active-surface"
                >
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      match.done ? "text-ink-muted line-through" : "text-ink"
                    }`}
                  >
                    {match.title}
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {phaseName(match.task.phaseId) ?? "No phase"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
