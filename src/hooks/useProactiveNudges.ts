"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { useChat } from "@/components/kash/chat/ChatProvider";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { useTRPC } from "@/trpc/client";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

function msUntilNextNudgeCheck(): number {
  const now = new Date();
  const next = new Date(now);
  const threshold =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_NUDGE_DEBUG_HOUR
      ? Number.parseInt(process.env.NEXT_PUBLIC_NUDGE_DEBUG_HOUR, 10)
      : 14;
  const hour = Number.isFinite(threshold) ? threshold : 14;
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function useProactiveNudges() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { railOpen, activeThreadId, isFocusRoute, notifyUnread, markRead } = useChat();
  const evaluatingRef = useRef(false);

  const evaluate = useCallback(async () => {
    if (evaluatingRef.current) return;
    evaluatingRef.current = true;

    try {
      const localDate = toISODateString(startOfLocalDay());
      const res = await fetch("/api/nudges/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localDate,
          tzOffsetMinutes: clientTzOffsetMinutes(),
        }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as {
        fired?: boolean;
        messageId?: string;
      };

      if (!data.fired) return;

      await queryClient.invalidateQueries({
        queryKey: trpc.chat.list.queryKey({ threadId: GLOBAL_THREAD_ID }),
      });

      const onGlobalThread = activeThreadId === GLOBAL_THREAD_ID;
      if (railOpen && onGlobalThread) {
        markRead(GLOBAL_THREAD_ID);
      } else {
        notifyUnread(GLOBAL_THREAD_ID);
      }

      if (isFocusRoute && !railOpen) {
        // Silent badge only — never auto-open rail on focus.
      }
    } finally {
      evaluatingRef.current = false;
    }
  }, [activeThreadId, isFocusRoute, markRead, notifyUnread, queryClient, railOpen, trpc.chat.list]);

  useEffect(() => {
    void evaluate();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void evaluate();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const timeoutId = window.setTimeout(() => {
      void evaluate();
    }, msUntilNextNudgeCheck());

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(timeoutId);
    };
  }, [evaluate]);
}
