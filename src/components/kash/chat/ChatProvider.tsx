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
import type { CaptureContext } from "@/lib/chat/capture-context";
import { GLOBAL_THREAD_ID, focusThreadId } from "@/lib/chat/threads";
import { planningSurfaceFromPathname, type PlanningChatSurface } from "@/lib/chat/planning-surface";

export type OpenRailOptions = {
  threadId?: string;
  captureContext?: CaptureContext;
};

type ChatContextValue = {
  railOpen: boolean;
  activeThreadId: string;
  planningSurface: PlanningChatSurface | null;
  captureContext: CaptureContext | null;
  unreadThreads: Set<string>;
  isFocusRoute: boolean;
  focusTaskId: string | null;
  toggleRail: () => void;
  openRail: (options?: OpenRailOptions) => void;
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
  const planningSurface = planningSurfaceFromPathname(pathname);

  // Collapsed by default; hydrated from sessionStorage after mount to avoid a
  // server/client mismatch, then persisted per session.
  const [railOpen, setRailOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string>(GLOBAL_THREAD_ID);
  const [captureContext, setCaptureContext] = useState<CaptureContext | null>(null);
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
    (options?: OpenRailOptions) => {
      if (options?.threadId) setActiveThreadId(options.threadId);
      setCaptureContext(options?.captureContext ?? null);
      setRailOpen(true);
      markRead(options?.threadId ?? activeThreadId);
    },
    [activeThreadId, markRead]
  );

  const closeRail = useCallback(() => {
    setCaptureContext(null);
    setRailOpen(false);
  }, []);

  const toggleRail = useCallback(() => {
    setRailOpen((open) => {
      if (open) {
        setCaptureContext(null);
        return false;
      }
      setCaptureContext(null);
      markRead(activeThreadId);
      return true;
    });
  }, [activeThreadId, markRead]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Chat toggle is ⌘/ (⌘/Ctrl+Slash), grouping it with the ⌘-family actions
      // (⌘K palette, ⌘D decide) while avoiding Chrome's ⌘J Downloads collision.
      if (!(e.metaKey || e.ctrlKey) || e.key !== "/") return;
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
      planningSurface,
      captureContext,
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
      planningSurface,
      captureContext,
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
