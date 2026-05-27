type Props = {
  variant: "due" | "saved";
  onOpen: () => void;
  onSnooze: () => void;
  onSkip: () => void;
};

export function EodReviewBanner({ variant, onOpen, onSnooze, onSkip }: Props) {
  return (
    <div
      className="glass-panel mb-4 flex flex-wrap items-center gap-3 px-4 py-3"
      role="region"
      aria-label="End of day review"
    >
      <p className="min-w-0 flex-1 text-sm text-kash-ink">
        {variant === "saved"
          ? "Today's review is saved."
          : "End of day review — take 2 minutes to close the loop."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="glass-pill px-3 py-1.5 text-sm font-medium"
          onClick={onOpen}
        >
          {variant === "saved" ? "View" : "Open"}
        </button>
        {variant === "due" ? (
          <>
            <button type="button" className="glass-btn-ghost text-sm" onClick={onSnooze}>
              Not now
            </button>
            <button type="button" className="glass-btn-ghost text-sm" onClick={onSkip}>
              Skip today
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
