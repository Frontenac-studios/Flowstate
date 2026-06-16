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
      className={`glass-pill relative px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink ${className ?? ""}`}
      aria-pressed={railOpen}
      aria-label={hasUnread ? "Toggle chat (unread)" : "Toggle chat"}
      title="Chat (⌘J)"
    >
      Chat {railOpen ? "☑" : "☐"}
      {hasUnread ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-kash-accent"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
