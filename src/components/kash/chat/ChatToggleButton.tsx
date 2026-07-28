"use client";

import { Sparkles, kashIconProps } from "@/components/kash/ui/icon";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";

import { useChat } from "./ChatProvider";

type Props = {
  /** Which thread's unread dot to show (defaults to global on plan, focus thread on focus route). */
  threadId?: string;
  /**
   * Mirrors the nav rail's expand state. Collapsed centers the icon like every
   * other rail icon; expanded reveals the "Ask Claude" label anchored beside a
   * fixed icon column so it stays clipped within the rail, exactly like the
   * nav-item labels.
   */
  expanded: boolean;
};

const FOCUS = "focus:outline-none focus-visible:bg-ink focus-visible:text-on-accent";

export function ChatToggleButton({ threadId, expanded }: Props) {
  const { railOpen, toggleRail, unreadThreads, isFocusRoute, activeThreadId } = useChat();
  const dotThread = threadId ?? (isFocusRoute ? activeThreadId : GLOBAL_THREAD_ID);
  const hasUnread =
    unreadThreads.has(dotThread) ||
    (isFocusRoute && !threadId && unreadThreads.has(GLOBAL_THREAD_ID));

  return (
    <button
      type="button"
      onClick={toggleRail}
      className={`flex h-9 items-center rounded-control bg-[var(--surface-selected)] text-ink transition hover:bg-[var(--surface-2)] ${
        expanded ? "pr-2" : ""
      } ${FOCUS}`}
      aria-pressed={railOpen}
      aria-label={hasUnread ? "Ask Claude (unread)" : "Ask Claude"}
      title="Ask Claude"
    >
      {/* Fixed icon column keeps the sparkle centered when collapsed (w-full)
          and aligned with the nav icons when expanded (w-nav-rail). */}
      <span
        className={`flex h-9 shrink-0 items-center justify-center ${expanded ? "w-nav-rail" : "w-full"}`}
      >
        <span className="relative flex items-center justify-center">
          <Sparkles {...kashIconProps({ tokenSize: "md" })} aria-hidden />
          {hasUnread ? (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" aria-hidden />
          ) : null}
        </span>
      </span>
      {/* Label fades in on expand and stays clipped inside the rail's
          overflow-hidden edge, matching the nav-item cascade. */}
      <span className="nav-cascade-item whitespace-nowrap text-sm font-medium">Ask Claude</span>
    </button>
  );
}
