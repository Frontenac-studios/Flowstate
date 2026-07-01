import type { EodFocusBar } from "@/lib/eod/types";

type Props = {
  bars: EodFocusBar[];
  overflowCount: number;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return "<1m";
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function FocusTimeChart({ bars, overflowCount }: Props) {
  if (bars.length === 0) {
    return <p className="text-body text-ink-muted">No focus time logged today.</p>;
  }

  const maxSeconds = Math.max(...bars.map((b) => b.seconds), 1);

  return (
    <div className="space-y-[var(--space-2)]">
      <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
        Focus time today
      </p>
      <ul className="space-y-[var(--space-2)]" aria-label="Focus time by task">
        {bars.map((bar) => (
          <li key={bar.taskId} className="space-y-[var(--space-1)]">
            <div className="flex justify-between gap-[var(--space-2)] text-body">
              <span className="truncate text-ink">{bar.title}</span>
              <span className="shrink-0 text-ink-muted">{formatDuration(bar.seconds)}</span>
            </div>
            <div className="h-[var(--space-1)] overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-medium motion-reduce:transition-none"
                style={{ width: `${Math.round((bar.seconds / maxSeconds) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {overflowCount > 0 ? (
        <p className="text-caption text-ink-muted">+{overflowCount} more tasks with focus time</p>
      ) : null}
    </div>
  );
}
