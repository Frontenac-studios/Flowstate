import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  /** One or two buttons — Spec v2 pairs a secondary with a primary. */
  action?: ReactNode;
  className?: string;
};

/** The first four project hues, drawn as short vertical stripes. */
const MARK_HUES = [
  "var(--project-1-solid)",
  "var(--project-2-solid)",
  "var(--project-3-solid)",
  "var(--project-personal-solid)",
];

/**
 * D12 / Spec v2 — project-stripe marks, one sentence saying what goes here, and
 * the actions (no dead "nothing here" ends).
 */
export function ColoredEmptyInvitation({ title, hint, action, className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center gap-[var(--space-4)] rounded-card border border-border bg-surface px-[var(--space-4)] py-[var(--space-6)] text-center shadow-surface ${className}`}
    >
      <div className="flex gap-[var(--space-1)]" aria-hidden>
        {MARK_HUES.map((hue) => (
          <span
            key={hue}
            className="h-6 w-[var(--stripe-width)] rounded-full"
            style={{ backgroundColor: hue }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="text-subtitle font-semibold text-ink">{title}</p>
        {hint ? <p className="max-w-[340px] text-pretty text-body text-ink-muted">{hint}</p> : null}
      </div>
      {action ? (
        <div className="flex flex-wrap justify-center gap-[var(--space-2)]">{action}</div>
      ) : null}
    </div>
  );
}
