import type { Top3Status } from "@/lib/eod/types";

const SLOT_LABELS = ["①", "②", "③"] as const;

type Props = {
  top3Status: Top3Status;
};

export function Top3ReviewSummary({ top3Status }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {top3Status.slots.map((slot) => {
        const label = SLOT_LABELS[slot.order - 1];
        const statusLabel =
          slot.status === "empty" ? "Empty" : slot.status === "done" ? "Done" : "Open";

        return (
          <div
            key={slot.order}
            className={`flex min-h-[4rem] flex-col justify-center rounded-pill border border-l-[3px] border-border bg-surface px-3 py-[var(--row-py)] ${
              slot.status === "empty" ? "border-transparent opacity-70" : "border-accent"
            }`}
          >
            <span className="text-xs text-accent">{label}</span>
            <span className="truncate text-sm font-medium text-ink">
              {slot.title ?? (slot.status === "empty" ? "—" : "Task")}
            </span>
            <span className="text-xs text-ink-muted">{statusLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
