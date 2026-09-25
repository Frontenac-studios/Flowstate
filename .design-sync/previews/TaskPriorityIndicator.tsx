import { TaskPriorityIndicator } from "../../src/components/kash/TaskPriorityIndicator";

/** VF-4 — count-coded pips on a graphite ramp; crimson only at High. */
export const Levels = () => (
  <div className="flex flex-col gap-2 text-meta text-ink-muted">
    {[
      [0, "None — renders nothing"],
      [1, "Low"],
      [2, "Med"],
      [3, "High"],
    ].map(([level, label]) => (
      <div key={String(label)} className="flex items-center gap-3">
        <TaskPriorityIndicator priority={level as number} reserveSpace />
        <span>{label as string}</span>
      </div>
    ))}
  </div>
);

/** In a task row: reserveSpace keeps the column from reflowing at None. */
export const InTaskRow = () => (
  <ul className="w-96 divide-y divide-[var(--border-subtle)] rounded-card border border-border bg-surface">
    {[
      { title: "Send the Great White report", priority: 3 },
      { title: "Reconcile September bills", priority: 2 },
      { title: "Tidy the Abyss tags", priority: 0 },
    ].map((t) => (
      <li key={t.title} className="flex items-center gap-[var(--space-3)] px-4 py-2">
        <TaskPriorityIndicator priority={t.priority} reserveSpace />
        <span className="text-body text-ink">{t.title}</span>
      </li>
    ))}
  </ul>
);
