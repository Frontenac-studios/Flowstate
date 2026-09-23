import { TaskDragHandle } from "../../src/components/kash/TaskDragHandle";

/** The shipped default (`grip_lines`) beside the unicode fallback. */
export const Variants = () => (
  <div className="flex items-center gap-6">
    <div className="flex items-center gap-2">
      <TaskDragHandle />
      <span className="text-meta text-ink-muted">grip_lines (default)</span>
    </div>
    <div className="flex items-center gap-2">
      <TaskDragHandle variant="unicode_dots" />
      <span className="text-meta text-ink-muted">unicode_dots</span>
    </div>
  </div>
);

/** In a row — deliberately near-invisible until hovered (25% ink). */
export const InTaskRow = () => (
  <ul className="w-96 divide-y divide-[var(--border-subtle)] rounded-card border border-border bg-surface">
    {["Send the Great White report", "Reconcile September bills", "Draft the Hume scope note"].map(
      (title) => (
        <li key={title} className="group flex items-center gap-[var(--space-3)] px-3 py-2">
          <TaskDragHandle />
          <span className="text-body text-ink">{title}</span>
        </li>
      )
    )}
  </ul>
);

/** Against a dark field so the low-contrast resting state is legible here. */
export const OnContrast = () => (
  <div className="flex items-center gap-4 rounded-card bg-canvas p-6">
    <TaskDragHandle className="text-ink" />
    <TaskDragHandle className="text-ink" variant="unicode_dots" />
  </div>
);
