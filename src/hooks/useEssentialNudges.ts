"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { DECIDE_EVENT } from "@/components/kash/chrome-events";
import { useChat } from "@/components/kash/chat/ChatProvider";
import { useUserConstraints } from "@/hooks/useUserConstraints";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { shouldSuppressInAppNudges } from "@/lib/about-me/constraint-eval";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

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

function chipKey(chip: EssentialNudgeChipPayload): string {
  return chip.kind;
}

export function useEssentialNudges() {
  const router = useRouter();
  const { planningSurface } = useChat();
  const { constraints } = useUserConstraints();
  const evaluatingRef = useRef(false);

  const [chips, setChips] = useState<EssentialNudgeChipPayload[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

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
          includeSelfCare: planningSurface === "today",
        }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as {
        chips?: EssentialNudgeChipPayload[];
      };

      if (!data.chips?.length) return;

      setChips((prev) => {
        const seen = new Set(prev.map(chipKey));
        const next = [...prev];
        for (const chip of data.chips ?? []) {
          if (!seen.has(chipKey(chip))) {
            next.push(chip);
            seen.add(chipKey(chip));
          }
        }
        return next;
      });
    } finally {
      evaluatingRef.current = false;
    }
  }, [constraints, planningSurface]);

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

  const dismissChip = useCallback((kind: EssentialNudgeChipPayload["kind"]) => {
    setDismissed((prev) => new Set(prev).add(kind));
  }, []);

  const handleAction = useCallback(
    (kind: EssentialNudgeChipPayload["kind"]) => {
      if (kind === "top3_stall") {
        window.dispatchEvent(new Event(DECIDE_EVENT));
      }
      if (kind === "self_care_walk") {
        router.push("/care");
      }
      dismissChip(kind);
    },
    [dismissChip, router]
  );

  const visibleChips = chips.filter((chip) => !dismissed.has(chipKey(chip)));

  return {
    chips: visibleChips,
    dismissChip,
    handleAction,
  };
}

/** @deprecated Use useEssentialNudges — kept for any legacy imports. */
export function useProactiveNudges() {
  useEssentialNudges();
}
