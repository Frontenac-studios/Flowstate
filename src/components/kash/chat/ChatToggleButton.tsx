"use client";

import { Sparkles, kashIconProps } from "@/components/kash/ui/icon";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";

import { useChat } from "./ChatProvider";

type Props = {
  /** Which thread's unread dot to show (defaults to global on plan, focus thread on focus route). */
  threadId?: string;
  className?: string;
  /** "icon" renders a square sparkle-only button for the collapsed nav rail. */
  variant?: "full" | "icon";
};

export function ChatToggleButton({ threadId, className, variant = "full" }: Props) {
  const { railOpen, toggleRail, unreadThreads, isFocusRoute, activeThreadId } = useChat();
  const dotThread = threadId ?? (isFocusRoute ? activeThreadId : GLOBAL_THREAD_ID);
  const hasUnread =
    unreadThreads.has(dotThread) ||
    (isFocusRoute && !threadId && unreadThreads.has(GLOBAL_THREAD_ID));

  return (
    <button
      type="button"
      onClick={toggleRail}
      className={`focus-visible:text-on-accent relative flex items-center rounded-control bg-[var(--surface-selected)] text-ink transition hover:bg-[var(--surface-2)] focus:outline-none focus-visible:bg-ink ${
        variant === "icon" ? "h-9 w-9 justify-center" : "gap-2 px-3 py-1.5 text-sm"
      } ${className ?? ""}`}
      aria-pressed={railOpen}
      aria-label={hasUnread ? "Ask Claude (unread)" : "Ask Claude"}
      title="Ask Claude"
    >
      <Sparkles {...kashIconProps({ tokenSize: "md" })} aria-hidden />
      {variant === "full" ? "Ask Claude" : null}
      {hasUnread ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" aria-hidden />
      ) : null}
    </button>
  );
}
