type Props = {
  priority: number;
  /** Keeps column width when priority is 0 (plan task rows). */
  reserveSpace?: boolean;
  className?: string;
};

export function TaskPriorityIndicator({ priority, reserveSpace = false, className = "" }: Props) {
  if (priority === 0) {
    if (!reserveSpace) return null;
    return <span className={`w-6 shrink-0 self-center ${className}`.trim()} aria-hidden />;
  }

  return (
    <span
      className={`shrink-0 self-center text-kash-accent ${className}`.trim()}
      aria-label={`Priority ${priority}`}
    >
      {"!".repeat(priority)}
    </span>
  );
}
