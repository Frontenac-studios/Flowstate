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
            className={`glass-pill flex min-h-[4rem] flex-col justify-center border-l-[3px] px-3 py-kash-task-y ${
              slot.status === "empty" ? "border-transparent opacity-70" : "border-kash-accent"
            }`}
          >
            <span className="text-xs text-kash-accent">{label}</span>
            <span className="truncate text-sm font-medium text-kash-ink">
              {slot.title ?? (slot.status === "empty" ? "—" : "Task")}
            </span>
            <span className="text-xs text-kash-ink-muted">{statusLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
