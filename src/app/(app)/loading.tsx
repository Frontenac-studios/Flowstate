/**
 * Instant loading state for in-app routes. The persistent shell (nav rail +
 * header) stays mounted via the (app) layout; only this content-area skeleton
 * swaps in while the destination page resolves, so navigation never shows a
 * frozen/blank screen.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded-control bg-surface" />
      <div className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-card border border-subtle bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
