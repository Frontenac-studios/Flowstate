"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import type { BingoCell, BingoGoal } from "@/lib/planning/bingo-grid";

type Props = {
  cell: BingoCell;
  locked: boolean;
  inWinningLine: boolean;
  busy: boolean;
  onToggleDone: (goal: BingoGoal) => void;
  onBackburner: (goal: BingoGoal) => void;
  onRemove: (goal: BingoGoal) => void;
  onAdd: (cellIndex: number) => void;
};

export default function BingoCellTile({
  cell,
  locked,
  inWinningLine,
  busy,
  onToggleDone,
  onBackburner,
  onRemove,
  onAdd,
}: Props) {
  const ring = inWinningLine ? "shadow-[0_0_0_2px_var(--ink)]" : "";

  if (cell.kind === "free") {
    return (
      <div
        className={`border-subtle flex aspect-square flex-col items-center justify-center rounded-card border bg-surface-2 text-ink-faint ${ring}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9l6.9-.7z" />
        </svg>
        <span className="mt-1 text-caption">Free</span>
      </div>
    );
  }

  if (cell.kind === "empty") {
    if (locked) {
      return (
        <div
          className={`border-subtle aspect-square rounded-card border border-dashed bg-surface ${ring}`}
          aria-hidden
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => onAdd(cell.cellIndex)}
        className={`border-subtle group flex aspect-square flex-col items-center justify-center rounded-card border border-dashed bg-surface text-ink-faint transition hover:border-ink-muted hover:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${ring}`}
        aria-label="Add a goal to this square"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth="2" strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
    );
  }

  const goal = cell.goal;
  const solid = categorySolidVar(goal.category);
  const categoryName = categorySeedLabel(goal.category);

  if (goal.state === "done") {
    return (
      <div
        className={`relative flex aspect-square flex-col justify-end overflow-hidden rounded-card p-2 ${ring}`}
        style={{ backgroundColor: solid }}
      >
        <button
          type="button"
          onClick={() => onToggleDone(goal)}
          disabled={busy}
          className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/25 text-white transition hover:bg-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          aria-label={`Mark "${goal.title}" not done`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-11" />
          </svg>
        </button>
        <span className="text-caption font-medium text-white/80">{categoryName}</span>
        <span className="line-clamp-3 text-meta font-medium text-white line-through">
          {goal.title}
        </span>
      </div>
    );
  }

  const backburnered = goal.state === "backburnered";

  return (
    <div
      className={`group relative flex aspect-square flex-col justify-end overflow-hidden rounded-card border-[1.5px] bg-surface p-2 ${
        backburnered ? "opacity-40" : ""
      } ${ring}`}
      style={{ borderColor: solid }}
    >
      {!backburnered ? (
        <button
          type="button"
          onClick={() => onToggleDone(goal)}
          disabled={busy}
          className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] text-transparent transition hover:text-current focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          style={{ borderColor: solid, color: solid }}
          aria-label={`Mark "${goal.title}" done`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-11" />
          </svg>
        </button>
      ) : null}

      <span className="text-caption font-medium" style={{ color: solid }}>
        {backburnered ? `${categoryName} · paused` : categoryName}
      </span>
      <span className="line-clamp-3 text-meta font-medium text-ink">{goal.title}</span>

      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onBackburner(goal)}
          disabled={busy}
          className="bg-surface/90 rounded-control px-1.5 py-0.5 text-caption text-ink-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
        >
          {backburnered ? "Resume" : "Pause"}
        </button>
        {!locked ? (
          <button
            type="button"
            onClick={() => onRemove(goal)}
            disabled={busy}
            className="bg-surface/90 rounded-control px-1.5 py-0.5 text-caption text-ink-muted transition hover:text-critical focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            aria-label={`Remove "${goal.title}"`}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
