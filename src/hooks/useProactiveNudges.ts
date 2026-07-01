"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { useChat } from "@/components/kash/chat/ChatProvider";
import { useUserConstraints } from "@/hooks/useUserConstraints";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { shouldSuppressInAppNudges } from "@/lib/about-me/constraint-eval";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { useTRPC } from "@/trpc/client";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** Defer the first mount evaluate until after initial paint / hydration. */
const INITIAL_DEFER_MS = 4_000;

function scheduleIdle(callback: () => void): number {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback);
  }
  return window.setTimeout(callback, 0);
}

function cancelIdle(id: number): void {
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
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
  const { constraints } = useUserConstraints();
  const evaluatingRef = useRef(false);

  const evaluate = useCallback(async () => {
    if (evaluatingRef.current) return;
    if (shouldSuppressInAppNudges(new Date(), constraints)) return;
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
  }, [
    activeThreadId,
    constraints,
    isFocusRoute,
    markRead,
    notifyUnread,
    queryClient,
    railOpen,
    trpc.chat.list,
  ]);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;

    const deferTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      idleId = scheduleIdle(() => {
        if (!cancelled) void evaluate();
      });
    }, INITIAL_DEFER_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void evaluate();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const nextCheckTimeoutId = window.setTimeout(() => {
      void evaluate();
    }, msUntilNextNudgeCheck());

    return () => {
      cancelled = true;
      window.clearTimeout(deferTimeoutId);
      window.clearTimeout(nextCheckTimeoutId);
      if (idleId !== undefined) cancelIdle(idleId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [evaluate]);
}
