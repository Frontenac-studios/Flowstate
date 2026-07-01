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
      className="row-arrive mb-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-3)] rounded-card border border-subtle bg-surface px-[var(--space-4)] py-[var(--space-3)]"
      role="region"
      aria-label="End of day review"
    >
      <p className="min-w-0 flex-1 text-body text-ink">
        {variant === "saved"
          ? "Today's review is saved."
          : "End of day review — take 2 minutes to close the loop."}
      </p>
      <div className="flex flex-wrap gap-[var(--space-2)]">
        <Button type="button" className="text-body" onClick={onOpen}>
          {variant === "saved" ? "View" : "Open"}
        </Button>
        {variant === "due" ? (
          <>
            <Button type="button" variant="ghost" className="text-body" onClick={onSnooze}>
              Not now
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
