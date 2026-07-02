import Button from "@/components/kash/ui/Button";

type Props = {
  variant: "due" | "saved";
  onOpen: () => void;
  onSnooze: () => void;
  onSkip: () => void;
};

export function EodReviewBanner({ variant, onOpen, onSnooze, onSkip }: Props) {
  return (
    <div
      className="row-arrive mb-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-2)] rounded-row border border-subtle bg-surface px-[var(--space-3)] py-[var(--space-2)]"
      role="region"
      aria-label="End of day review"
    >
      <p className="min-w-0 flex-1 text-body text-ink-muted">
        {variant === "saved"
          ? "Today's review is saved."
          : "The day is winding down — a moment to reflect when you're ready."}
      </p>
      <div className="flex flex-wrap gap-[var(--space-2)]">
        <Button type="button" className="text-body" onClick={onOpen}>
          {variant === "saved" ? "View" : "Review"}
        </Button>
        {variant === "due" ? (
          <>
            <Button type="button" variant="ghost" className="text-body" onClick={onSnooze}>
              Later
            </Button>
            <Button type="button" variant="ghost" className="text-body" onClick={onSkip}>
              Skip today
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
