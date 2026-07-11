"use client";

/**
 * First-run bingo intro. Two honest on-ramps: talk to the goals coach, or start with a
 * blank grid and fill squares yourself. (The old fake "AI brain-dump" and guided modes
 * were retired when the real coach shipped.)
 */
type Props = {
  year: number;
  coachAvailable: boolean;
  onStartCoach: () => void;
  onBlank: () => void;
};

export default function BingoOnboarding({ year, coachAvailable, onStartCoach, onBlank }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-subtle bg-surface p-8 shadow-surface">
      <h2 className="text-body font-semibold text-ink">Your {year} bingo card</h2>
      <p className="text-body text-ink-muted">
        A 5×5 grid of goals — line up five done squares for a win. How would you like to start?
      </p>
      <div className={`grid gap-3 ${coachAvailable ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
        {coachAvailable ? (
          <button
            type="button"
            onClick={onStartCoach}
            className="flex flex-col gap-1 rounded-card border border-subtle bg-surface p-4 text-left transition hover:border-ink-muted hover:bg-surface-2"
          >
            <span className="text-body font-medium text-ink">Talk to your coach</span>
            <span className="text-caption text-ink-muted">
              Think it through together — the coach asks a few questions, then suggests goals.
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBlank}
          className="flex flex-col gap-1 rounded-card border border-subtle bg-surface p-4 text-left transition hover:border-ink-muted hover:bg-surface-2"
        >
          <span className="text-body font-medium text-ink">Start blank</span>
          <span className="text-caption text-ink-muted">
            Begin with an empty grid and fill squares yourself.
          </span>
        </button>
      </div>
    </div>
  );
}
