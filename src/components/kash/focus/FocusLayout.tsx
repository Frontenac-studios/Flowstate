import Link from "next/link";

import { GradientBackdrop } from "@/components/kash/GradientBackdrop";
import { formatHeaderDate } from "@/lib/dates/local-day";

export function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <GradientBackdrop />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight text-kash-ink">Kash</span>
            <time className="text-kash-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
              {formatHeaderDate()}
            </time>
          </div>
          <Link
            href="/plan"
            className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
          >
            Back to plan
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
