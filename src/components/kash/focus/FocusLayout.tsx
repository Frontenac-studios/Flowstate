import Link from "next/link";

import { KeyCap } from "@/components/kash/ui/KeyCap";

export function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-surface">
      {/* Desktop (Tauri) drag handle. Must keep pointer events (Tauri only
          starts a drag on a mousedown that lands directly on the region), so it
          is NOT pointer-events-none. The "← Plan" link and "Esc" hint render as
          later siblings on top, so they stay clickable; the rest of the band
          drags the window. Gated to the Tauri runtime via .app-drag-strip. */}
      <div
        data-tauri-drag-region
        className="app-drag-strip absolute inset-x-0 top-0 z-sticky h-12"
        aria-hidden
      />
      <div className="absolute left-4 top-4 z-sticky">
        <Link
          href="/today"
          className="pointer-events-auto rounded-chip px-2 py-1 text-sm text-ink-faint transition hover:text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
        >
          ← Plan
        </Link>
      </div>
      <div className="absolute right-4 top-4 z-sticky flex items-center gap-1.5 text-caption text-ink-faint">
        <KeyCap>Esc</KeyCap>
        <span>to exit</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
