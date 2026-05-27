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
    return <p className="text-sm text-kash-ink-muted">No focus time logged today.</p>;
  }

  const maxSeconds = Math.max(...bars.map((b) => b.seconds), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
        Focus time today
      </p>
      <ul className="space-y-2" aria-label="Focus time by task">
        {bars.map((bar) => (
          <li key={bar.taskId} className="space-y-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate text-kash-ink">{bar.title}</span>
              <span className="shrink-0 text-kash-ink-muted">{formatDuration(bar.seconds)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/40">
              <div
                className="h-full rounded-full bg-kash-accent transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.round((bar.seconds / maxSeconds) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {overflowCount > 0 ? (
        <p className="text-xs text-kash-ink-muted">+{overflowCount} more tasks with focus time</p>
      ) : null}
    </div>
  );
}
