import { TaskPriorityIndicator } from "../../src/components/kash/TaskPriorityIndicator";

/** Spec v2 — only High is marked (crimson "!"); None, Low and Med render nothing. */
export const Levels = () => (
  <div className="flex flex-col gap-2 text-meta text-ink-muted">
    {[
      [0, "None — renders nothing"],
      [1, "Low — renders nothing"],
      [2, "Med — renders nothing"],
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
      <li key={t.title} className="flex items-center gap-[var(--space-2)] px-4 py-2">
        <TaskPriorityIndicator priority={t.priority} reserveSpace />
        <span className="text-body text-ink">{t.title}</span>
      </li>
    ))}
  </ul>
);
