"use client";

import { Compass, Target, X } from "@/components/kash/ui/icon";

/**
 * The one-time guided teach of the Direction → Target model (W5, §13 Q6). Fires
 * only at zero-Directions / never-dismissed, and never again once dismissed — a
 * teach, not a recurring gate. Dismissal is persisted via app_settings by the
 * caller.
 */
export default function QuarterFirstRun({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="relative rounded-card border border-border bg-surface-2 p-5 shadow-surface">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-control p-1 text-ink-muted transition hover:text-ink"
      >
        <X size={16} />
      </button>

      <h2 className="text-body font-medium text-ink">This is the Quarter.</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">
        Two things live here — a <strong className="font-medium text-ink">Direction</strong> and a{" "}
        <strong className="font-medium text-ink">bet</strong>. Set one of each to start.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Compass size={18} className="mt-0.5 shrink-0 text-ink-muted" />
          <p className="text-sm text-ink-muted">
            A <strong className="font-medium text-ink">Direction</strong> is a rule for saying no —
            written as a sentence, never measured.{" "}
            <em>“We serve early-stage teams shipping production software.”</em>
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Target size={18} className="mt-0.5 shrink-0 text-ink-muted" />
          <p className="text-sm text-ink-muted">
            A <strong className="font-medium text-ink">bet</strong> takes a number and a date. Up to
            three a quarter. <em>“$40k booked by September.”</em>
          </p>
        </div>
      </div>

      <p className="mt-4 text-caption text-ink-muted">
        Type either one below — if it has a number, it becomes a bet.
      </p>
    </section>
  );
}
