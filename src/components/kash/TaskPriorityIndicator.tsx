import { priorityMeta } from "@/lib/tasks/priority";

type Props = {
  priority: number;
  /** Keeps column width when nothing is marked (reserved zone — no reflow). */
  reserveSpace?: boolean;
  className?: string;
};

/**
 * Spec v2 — only High priority is marked on a row, as a crimson "!". Low and Med
 * render nothing (they still filter and sort; the row just stays quiet).
 */
export function TaskPriorityIndicator({ priority, reserveSpace = false, className = "" }: Props) {
  const meta = priorityMeta(priority);

  if (meta.level !== 3) {
    if (!reserveSpace) return null;
    return <span className={`w-3 shrink-0 self-center ${className}`.trim()} aria-hidden />;
  }

  return (
    <span
      className={`w-3 shrink-0 self-center text-right text-caption font-bold leading-none text-critical ${className}`.trim()}
      role="img"
      aria-label={`Priority ${meta.label}`}
    >
      !
    </span>
  );
}
