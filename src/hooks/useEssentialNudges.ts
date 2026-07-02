"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DECIDE_EVENT } from "@/components/kash/chrome-events";
import { useChat } from "@/components/kash/chat/ChatProvider";
import { useUserConstraints } from "@/hooks/useUserConstraints";
import { shouldSuppressInAppNudges } from "@/lib/about-me/constraint-eval";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import { useTRPC } from "@/trpc/client";

const INITIAL_DEFER_MS = 4_000;
const RELEASE_BEAT_MS = 15_000;

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export function useEssentialNudges() {
  const router = useRouter();
  const trpc = useTRPC();
  const { planningSurface } = useChat();
  const { constraints } = useUserConstraints();
  const evaluatingRef = useRef(false);
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());

  const [opener, setOpener] = useState<EssentialNudgeChipPayload | null>(null);
  const [chip, setChip] = useState<EssentialNudgeChipPayload | null>(null);
  const [queue, setQueue] = useState<EssentialNudgeChipPayload[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const canShowProblem =
    (settings?.assistanceEnabled ?? true) && !shouldSuppressInAppNudges(new Date(), constraints);

  const evaluate = useCallback(async () => {
    if (evaluatingRef.current) return;
    if (settings && !settings.notificationsEnabled) return;
    evaluatingRef.current = true;
    try {
      const res = await fetch("/api/nudges/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localDate: toISODateString(startOfLocalDay()),
          tzOffsetMinutes: clientTzOffsetMinutes(),
          includeSelfCare: planningSurface === "today",
          includeMonthlyReview: planningSurface === "plan" || planningSurface === "reviews",
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { chips?: EssentialNudgeChipPayload[] };
      const incoming = data.chips ?? [];
      if (incoming.length === 0) return;

      const reassurance = incoming.filter((c) => c.klass === "reassurance");
      const problem = incoming
        .filter((c) => c.klass === "problem")
        .sort((a, b) => a.priority - b.priority);

      if (reassurance.length > 0) {
        setOpener((prev) => prev ?? reassurance[0] ?? null);
      }
      if (canShowProblem && problem.length > 0) {
        setChip((prev) => prev ?? problem[0] ?? null);
        setQueue((prev) => [...prev, ...problem.slice(1)]);
      }
    } finally {
      evaluatingRef.current = false;
    }
  }, [canShowProblem, planningSurface, settings]);

  useEffect(() => {
    const id = window.setTimeout(() => void evaluate(), INITIAL_DEFER_MS);
    return () => window.clearTimeout(id);
  }, [evaluate]);

  useEffect(() => {
    if (!canShowProblem || chip != null || queue.length === 0) return;
    const next = queue[0];
    if (!next) return;
    const id = window.setTimeout(() => {
      setChip(next);
      setQueue((prev) => prev.slice(1));
    }, RELEASE_BEAT_MS);
    return () => window.clearTimeout(id);
  }, [canShowProblem, chip, queue]);

  const dismiss = useCallback((kind: EssentialNudgeChipPayload["kind"]) => {
    setDismissed((prev) => new Set(prev).add(kind));
    setChip((prev) => (prev?.kind === kind ? null : prev));
    setOpener((prev) => (prev?.kind === kind ? null : prev));
  }, []);

  const handleAction = useCallback(
    (payload: EssentialNudgeChipPayload) => {
      switch (payload.action?.type) {
        case "decide":
          window.dispatchEvent(new Event(DECIDE_EVENT));
          break;
        case "open_care":
          router.push("/care");
          break;
        case "open_backlog":
          router.push("/abyss");
          break;
        case "open_top3":
          window.dispatchEvent(new Event(DECIDE_EVENT));
          break;
        default:
          break;
      }
      dismiss(payload.kind);
    },
    [dismiss, router]
  );

  const visibleChip = useMemo(
    () => (chip && !dismissed.has(chip.kind) ? chip : null),
    [chip, dismissed]
  );

  return { opener, chip: visibleChip, dismiss, handleAction };
}

export function useProactiveNudges() {
  useEssentialNudges();
}
