"use client";

import { Check, Plus, Star, kashIconProps } from "@/components/kash/ui/icon";
import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import type { BingoCell, BingoGoal } from "@/lib/planning/bingo-grid";

type Props = {
  cell: BingoCell;
  locked: boolean;
  locking?: boolean;
  inWinningLine: boolean;
  busy: boolean;
  onToggleDone: (goal: BingoGoal) => void;
  onBackburner: (goal: BingoGoal) => void;
  onRemove: (goal: BingoGoal) => void;
  onAdd: (cellIndex: number) => void;
  onOpenGoal?: (goal: BingoGoal) => void;
};

export default function BingoCellTile({
  cell,
  locked,
  locking = false,
  inWinningLine,
  busy,
  onToggleDone,
  onBackburner,
  onRemove,
  onAdd,
  onOpenGoal,
}: Props) {
  const ring = inWinningLine ? "shadow-[0_0_0_2px_var(--ink)]" : "";
  const lockable = locking ? "bingo-cell-lockable" : "";

  if (cell.kind === "free") {
    return (
      <div
        className={`flex aspect-square flex-col items-center justify-center rounded-card border border-subtle bg-surface-2 text-ink-faint shadow-surface ${ring} ${lockable}`}
      >
        <Star {...kashIconProps({ tokenSize: "lg", className: "fill-current" })} aria-hidden />
        <span className="mt-1 text-caption">Free</span>
      </div>
    );
  }

  if (cell.kind === "empty") {
    if (locked) {
      return (
        <div
          className={`aspect-square rounded-card border border-dashed border-subtle bg-surface shadow-surface ${ring} ${lockable}`}
          aria-hidden
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => onAdd(cell.cellIndex)}
        className={`group flex aspect-square flex-col items-center justify-center rounded-card border border-dashed border-subtle bg-surface text-ink-faint shadow-surface transition hover:border-ink-muted hover:text-ink-muted focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${ring} ${lockable}`}
        aria-label="Add a goal to this square"
      >
        <Plus {...kashIconProps({ tokenSize: "md", className: "text-ink-muted" })} aria-hidden />
      </button>
    );
  }

  const goal = cell.goal;
  const solid = categorySolidVar(goal.category);
  const categoryName = categorySeedLabel(goal.category);

  if (goal.state === "done") {
    return (
      <div
        className={`relative flex aspect-square flex-col justify-end overflow-hidden rounded-card p-2 ${ring} ${inWinningLine ? "bingo-line-bounce" : ""}`}
        style={{ backgroundColor: solid }}
      >
        <button
          type="button"
          onClick={() => onOpenGoal?.(goal)}
          className="absolute inset-0 z-base rounded-card focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--on-accent)]"
          aria-label={`Open goal: ${goal.title}`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone(goal);
          }}
          disabled={busy}
          className="absolute right-1.5 top-1.5 z-sticky flex h-icon-md w-icon-md items-center justify-center rounded-full bg-white/25 text-white transition hover:bg-white/40 focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--on-accent)] disabled:opacity-50"
          aria-label={`Mark "${goal.title}" not done`}
        >
          <Check {...kashIconProps({ tokenSize: "sm", className: "text-white" })} aria-hidden />
        </button>
        <span className="relative text-caption font-medium text-white/80">{categoryName}</span>
        <span className="relative line-clamp-3 text-meta font-medium text-white line-through">
          {goal.title}
        </span>
      </div>
    );
  }

  const backburnered = goal.state === "backburnered";

  return (
    <div
      className={`group relative flex aspect-square flex-col justify-end overflow-hidden rounded-card border-[1.5px] bg-surface p-2 shadow-surface ${
        backburnered ? "opacity-40" : ""
      } ${ring} ${lockable} ${inWinningLine ? "bingo-line-bounce" : ""}`}
      style={{ borderColor: solid }}
    >
      <button
        type="button"
        onClick={() => onOpenGoal?.(goal)}
        className="absolute inset-0 z-base rounded-card focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        aria-label={`Open goal: ${goal.title}`}
      />
      {!backburnered ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone(goal);
          }}
          disabled={busy}
          className="absolute right-1.5 top-1.5 z-sticky flex h-icon-md w-icon-md items-center justify-center rounded-full border-[1.5px] text-transparent transition hover:text-current focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] disabled:opacity-50"
          style={{ borderColor: solid, color: solid }}
          aria-label={`Mark "${goal.title}" done`}
        >
          <Check {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
        </button>
      ) : null}

      <span className="relative text-caption font-medium" style={{ color: solid }}>
        {backburnered ? `${categoryName} · paused` : categoryName}
      </span>
      <span className="relative line-clamp-3 text-meta font-medium text-ink">{goal.title}</span>

      <div className="relative z-sticky flex justify-end gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBackburner(goal);
          }}
          disabled={busy}
          className="bg-surface/90 rounded-control px-1.5 py-0.5 text-caption text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] disabled:opacity-50"
        >
          {backburnered ? "Resume" : "Pause"}
        </button>
        {!locked ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(goal);
            }}
            disabled={busy}
            className="bg-surface/90 rounded-control px-1.5 py-0.5 text-caption text-ink-muted transition hover:text-critical focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] disabled:opacity-50"
            aria-label={`Remove "${goal.title}"`}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
