type Props = {
  /** Short line describing what failed, e.g. "This month didn't load." */
  message?: string;
  onRetry?: () => void;
  className?: string;
};

/**
 * Inline error state for a failed `useQuery`, so a broken fetch reads as an
 * error (with a retry) rather than an empty surface. Mirrors the AbyssRoot
 * pattern (role="alert" + "Try again").
 */
export function QueryErrorNotice({
  message = "Something didn't load.",
  onRetry,
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={`rounded-row border border-subtle bg-surface p-4 text-center text-meta text-ink-muted ${className ?? ""}`}
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-control px-3 py-1 text-ink underline underline-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
