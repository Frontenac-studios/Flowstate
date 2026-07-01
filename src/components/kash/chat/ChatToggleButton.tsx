"use client";

import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";

import { useChat } from "./ChatProvider";

type Props = {
  /** Which thread's unread dot to show (defaults to global on plan, focus thread on focus route). */
  threadId?: string;
  className?: string;
};

export function ChatToggleButton({ threadId, className }: Props) {
  const { railOpen, toggleRail, unreadThreads, isFocusRoute, activeThreadId } = useChat();
  const dotThread = threadId ?? (isFocusRoute ? activeThreadId : GLOBAL_THREAD_ID);
  const hasUnread =
    unreadThreads.has(dotThread) ||
    (isFocusRoute && !threadId && unreadThreads.has(GLOBAL_THREAD_ID));

  return (
    <button
      type="button"
      onClick={toggleRail}
      className={`focus-visible:text-on-accent relative flex items-center gap-2 rounded-control bg-[var(--surface-selected)] px-3 py-1.5 text-sm text-ink transition hover:bg-[var(--surface-2)] focus:outline-none focus-visible:bg-ink ${className ?? ""}`}
      aria-pressed={railOpen}
      aria-label={hasUnread ? "Ask Claude (unread)" : "Ask Claude"}
      title="Ask Claude (⌘/)"
    >
      Ask Claude
      <kbd className="font-mono text-caption text-ink-muted" aria-hidden>
        ⌘/
      </kbd>
      {hasUnread ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" aria-hidden />
      ) : null}
    </button>
  );
}
