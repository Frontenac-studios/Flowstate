import Link from "next/link";

import { formatHeaderDate } from "@/lib/dates/local-day";

import { GradientBackdrop } from "../GradientBackdrop";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <GradientBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-4 py-6 sm:px-6 lg:px-10">
        <header className="glass-panel-strong mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-kash-ink">
          <Link href="/plan" className="font-semibold tracking-tight">
            Kash
          </Link>
          <span className="text-kash-ink-muted" aria-hidden>
            ·
          </span>
          <time className="text-kash-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
            {formatHeaderDate()}
          </time>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/plan"
              className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
            >
              Plan
            </Link>
            <Link
              href="/settings"
              className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
            >
              Settings
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
