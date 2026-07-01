/**
 * Renders the static warm-stone backdrop. Server component so it's painted on
 * the first frame across web and desktop.
 */
export function AppBackdrop() {
  return <div className="kash-backdrop pointer-events-none fixed inset-0 z-base" aria-hidden />;
}
