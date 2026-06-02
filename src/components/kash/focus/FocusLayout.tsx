import Link from "next/link";

import { ChatProvider } from "@/components/kash/chat/ChatProvider";
import { ChatRail } from "@/components/kash/chat/ChatRail";
import { ChatToggleButton } from "@/components/kash/chat/ChatToggleButton";
import { ProactiveNudgesRunner } from "@/components/kash/nudges/ProactiveNudgesRunner";
import { formatHeaderDate } from "@/lib/dates/local-day";

export function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ProactiveNudgesRunner />
      <div className="relative min-h-screen">
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl gap-4 px-4 py-6 sm:px-6">
          <div className="min-w-0 max-w-3xl flex-1">
            <header className="mb-6 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold tracking-tight text-kash-ink">Kash</span>
                <time
                  className="text-kash-ink-muted"
                  dateTime={new Date().toISOString().slice(0, 10)}
                >
                  {formatHeaderDate()}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <ChatToggleButton />
                <Link
                  href="/plan"
                  className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
                >
                  Back to plan
                </Link>
              </div>
            </header>
            {children}
          </div>
          <ChatRail />
        </div>
      </div>
    </ChatProvider>
  );
}
