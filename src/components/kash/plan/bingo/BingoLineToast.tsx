"use client";

type Props = {
  message: string;
  onDismiss: () => void;
};

/** In-place toast for line bingo rewards (RW-1) — no modal overlay. */
export default function BingoLineToast({ message, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-card border border-subtle bg-surface px-4 py-3 shadow-lg motion-safe:animate-[slideUp_240ms_ease-out]"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-ink"
        fill="currentColor"
        aria-hidden
      >
        <path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9l6.9-.7z" />
      </svg>
      <span className="text-body text-ink">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 text-caption text-ink-muted transition hover:text-ink"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
