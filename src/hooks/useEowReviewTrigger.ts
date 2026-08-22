"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { currentWeekStartIso } from "@/lib/eow/current-week-key";
import {
  isEowDismissedForWeek,
  isEowSkippedForWeek,
  isEowSnoozed,
  readEowStorage,
  setEowDismissedWeekStart,
} from "@/lib/eow/eow-storage";
import { resolveEowUiState } from "@/lib/eow/resolve-eow-ui-state";
import type { EowUiState } from "@/lib/eow/types";
import { isWeekWindDownDue } from "@/lib/eow/week-wind-down";
import { useWeekWindDown } from "@/hooks/useWeekWindDown";

export function useEowReviewTrigger() {
  const pathname = usePathname();
  const [weekWindDown] = useWeekWindDown();
  const [storageTick, setStorageTick] = useState(0);
  const [crossedOnPage, setCrossedOnPage] = useState(false);
  const [initialAfterDue, setInitialAfterDue] = useState(false);
  const [weekStartIso, setWeekStartIso] = useState(() => currentWeekStartIso());
  const prevDueRef = useRef(isWeekWindDownDue(new Date(), weekWindDown));
  const mountedRef = useRef(false);

  void storageTick;
  const storage = readEowStorage();

  const reviewDue = isWeekWindDownDue(new Date(), weekWindDown);
  const dismissedForWeek = isEowDismissedForWeek(weekStartIso, storage.dismissedWeekStart);
  const skippedForWeek = isEowSkippedForWeek(weekStartIso, storage.skippedWeekStart);
  const snoozed = isEowSnoozed(new Date(), storage.snoozeUntil);

  const refreshStorage = useCallback(() => {
    setStorageTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const syncWeek = () => {
      const next = currentWeekStartIso();
      setWeekStartIso((prev) => (prev === next ? prev : next));
    };

    syncWeek();
    const id = window.setInterval(syncWeek, 60_000);
    document.addEventListener("visibilitychange", syncWeek);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", syncWeek);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/this-week" || !reviewDue || dismissedForWeek || skippedForWeek || snoozed) {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      setInitialAfterDue(true);
    }
  }, [pathname, reviewDue, dismissedForWeek, skippedForWeek, snoozed]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      const dueNow = isWeekWindDownDue(now, weekWindDown);
      const wasDue = prevDueRef.current;

      if (!wasDue && dueNow && pathname === "/this-week") {
        setCrossedOnPage(true);
      }

      prevDueRef.current = dueNow;
    }, 60_000);

    return () => window.clearInterval(id);
  }, [pathname, weekWindDown]);

  const uiState: EowUiState = resolveEowUiState({
    pathname,
    reviewDue,
    dismissedForWeek,
    skippedForWeek,
    snoozed,
    initialVisitAfterDue: initialAfterDue,
    crossedThresholdOnPage: crossedOnPage,
  });

  const dismissChip = useCallback(() => {
    setEowDismissedWeekStart(weekStartIso);
    refreshStorage();
    setInitialAfterDue(false);
    setCrossedOnPage(false);
  }, [refreshStorage, weekStartIso]);

  const openReview = useCallback(() => {
    setInitialAfterDue(false);
    setCrossedOnPage(false);
    document
      .getElementById("weekly-summary")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return {
    weekStartIso,
    weekWindDown,
    uiState,
    showChip: uiState === "chip",
    reviewDue,
    openReview,
    dismissChip,
    refreshStorage,
  };
}
