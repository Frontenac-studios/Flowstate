import Link from "next/link";

import { formatHeaderDate } from "@/lib/dates/local-day";

export function FocusLayout({ children }: { children: React.ReactNode }) {
  // Focus is deliberately distraction-free: no chat rail, no chat toggle, and
  // no proactive nudges — entering Focus is the app's "Do Not Disturb".
  return (
    <div className="relative min-h-screen">
      <div className="relative z-sticky mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-medium tracking-tight text-ink">Kash</span>
            <time className="text-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
              {formatHeaderDate()}
            </time>
          </div>
          <Link
            href="/today"
            className="focus-visible:text-on-accent rounded-chip px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:bg-ink"
          >
            Back to plan
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
