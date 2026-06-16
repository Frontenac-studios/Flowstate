"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { readChatRailOpen, writeChatRailOpen } from "@/lib/chat/chat-rail-storage";
import { GLOBAL_THREAD_ID, focusThreadId } from "@/lib/chat/threads";

type ChatContextValue = {
  railOpen: boolean;
  activeThreadId: string;
  unreadThreads: Set<string>;
  isFocusRoute: boolean;
  focusTaskId: string | null;
  toggleRail: () => void;
  openRail: (threadId?: string) => void;
  closeRail: () => void;
  setActiveThreadId: (threadId: string) => void;
  markRead: (threadId: string) => void;
  notifyUnread: (threadId: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFocusRoute = pathname.startsWith("/today/focus");

  // Collapsed by default; hydrated from sessionStorage after mount to avoid a
  // server/client mismatch, then persisted per session.
  const [railOpen, setRailOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string>(GLOBAL_THREAD_ID);
  const [unreadThreads, setUnreadThreads] = useState<Set<string>>(() => new Set());
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (readChatRailOpen()) setRailOpen(true);
  }, []);

  useEffect(() => {
    writeChatRailOpen(railOpen);
  }, [railOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");
    setFocusTaskId(taskId);

    if (isFocusRoute && taskId) {
      setActiveThreadId(focusThreadId(taskId));
    } else if (!isFocusRoute) {
      setActiveThreadId(GLOBAL_THREAD_ID);
    }
  }, [isFocusRoute, pathname]);

  const markRead = useCallback((threadId: string) => {
    setUnreadThreads((prev) => {
      if (!prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
  }, []);

  const notifyUnread = useCallback(
    (threadId: string) => {
      if (railOpen && activeThreadId === threadId) return;
      setUnreadThreads((prev) => new Set(prev).add(threadId));
    },
    [activeThreadId, railOpen]
  );

  const openRail = useCallback(
    (threadId?: string) => {
      if (threadId) setActiveThreadId(threadId);
      setRailOpen(true);
      markRead(threadId ?? activeThreadId);
    },
    [activeThreadId, markRead]
  );

  const closeRail = useCallback(() => setRailOpen(false), []);

  const toggleRail = useCallback(() => {
    setRailOpen((open) => {
      if (open) return false;
      markRead(activeThreadId);
      return true;
    });
  }, [activeThreadId, markRead]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Chat toggle is ⌃J (⌘K is reserved for the command palette).
      if (!e.ctrlKey || e.metaKey || e.key.toLowerCase() !== "j") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      toggleRail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleRail]);

  const value = useMemo(
    () => ({
      railOpen,
      activeThreadId,
      unreadThreads,
      isFocusRoute,
      focusTaskId,
      toggleRail,
      openRail,
      closeRail,
      setActiveThreadId,
      markRead,
      notifyUnread,
    }),
    [
      railOpen,
      activeThreadId,
      unreadThreads,
      isFocusRoute,
      focusTaskId,
      toggleRail,
      openRail,
      closeRail,
      markRead,
      notifyUnread,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return ctx;
}
