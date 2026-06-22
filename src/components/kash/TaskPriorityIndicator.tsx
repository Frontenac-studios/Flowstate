import { priorityMeta } from "@/lib/tasks/priority";

type Props = {
  priority: number;
  /** Keeps column width when priority is None (reserved zone — no reflow). */
  reserveSpace?: boolean;
  className?: string;
};

/** Urgency pips: 1/2/3 dots on a muted → amber → red ramp; None renders empty. */
export function TaskPriorityIndicator({ priority, reserveSpace = false, className = "" }: Props) {
  const meta = priorityMeta(priority);

  if (meta.dots === 0) {
    if (!reserveSpace) return null;
    return <span className={`w-6 shrink-0 self-center ${className}`.trim()} aria-hidden />;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 self-center ${className}`.trim()}
      aria-label={`Priority ${meta.label}`}
    >
      {Array.from({ length: meta.dots }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      ))}
    </span>
  );
}
