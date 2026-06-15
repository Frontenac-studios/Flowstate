import Link from "next/link";

import { formatHeaderDate } from "@/lib/dates/local-day";

export default function ProjectsLayout({
  children,
  showBackToProjects = false,
}: {
  children: React.ReactNode;
  showBackToProjects?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[110rem] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
        <header className="glass-panel-strong mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-kash-ink">
          <Link href="/today" className="font-semibold tracking-tight">
            Kash
          </Link>
          <span className="text-kash-ink-muted" aria-hidden>
            ·
          </span>
          <time className="text-kash-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
            {formatHeaderDate()}
          </time>
          <div className="ml-auto flex items-center gap-2">
            {showBackToProjects ? (
              <Link
                href="/projects"
                className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
              >
                Projects
              </Link>
            ) : null}
            <Link
              href="/today"
              className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
            >
              Today
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
