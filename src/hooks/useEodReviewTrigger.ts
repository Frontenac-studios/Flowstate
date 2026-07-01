"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { shouldSuppressInAppNudges } from "@/lib/about-me/constraint-eval";
import {
  isSkippedForDate,
  isSnoozed,
  readEodStorage,
  setSkippedDate,
  setSnoozeUntil,
} from "@/lib/eod/eod-storage";
import { resolveEodUiState } from "@/lib/eod/resolve-eod-ui-state";
import type { EodUiState } from "@/lib/eod/types";
import { useWindDownHour } from "@/hooks/useWindDownHour";
import { useUserConstraints } from "@/hooks/useUserConstraints";
import { useTRPC } from "@/trpc/client";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

function localHourNow(): number {
  return new Date().getHours();
}

function currentLocalDate(): string {
  return toISODateString(startOfLocalDay());
}

export function useEodReviewTrigger() {
  const trpc = useTRPC();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [storageTick, setStorageTick] = useState(0);
  const [crossedOnPage, setCrossedOnPage] = useState(false);
  const [initialAfterDue, setInitialAfterDue] = useState(false);
  const [localDate, setLocalDate] = useState(currentLocalDate);
  const prevHourRef = useRef(localHourNow());
  const mountedRef = useRef(false);

  const tzOffsetMinutes = clientTzOffsetMinutes();
  const [windDownHour] = useWindDownHour();
  const { constraints } = useUserConstraints();
  const nudgeQuiet = shouldSuppressInAppNudges(new Date(), constraints);

  const { data: savedRow } = useQuery({
    ...trpc.dayReviews.getForDate.queryOptions({ localDate }),
  });

  const savedReviewExists = Boolean(savedRow?.summary);

  void storageTick;
  const storage = readEodStorage();

  const reviewDue = localHourNow() >= windDownHour;
  const skippedForToday = isSkippedForDate(localDate, storage.skippedDate);
  const snoozed = isSnoozed(new Date(), storage.snoozeUntil);

  const refreshStorage = useCallback(() => {
    setStorageTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const syncLocalDate = () => {
      const next = currentLocalDate();
      setLocalDate((prev) => (prev === next ? prev : next));
    };

    syncLocalDate();
    const id = window.setInterval(syncLocalDate, 60_000);
    document.addEventListener("visibilitychange", syncLocalDate);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", syncLocalDate);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/today" || !reviewDue || skippedForToday || snoozed) return;
    if (storage.modalShownForDate === localDate) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      setInitialAfterDue(true);
    }
  }, [pathname, reviewDue, skippedForToday, snoozed, storage.modalShownForDate, localDate]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const hour = localHourNow();
      const prev = prevHourRef.current;

      if (prev < windDownHour && hour >= windDownHour && pathname === "/today") {
        setCrossedOnPage(true);
      }
      prevHourRef.current = hour;
    }, 60_000);

    return () => window.clearInterval(id);
  }, [pathname, windDownHour]);

  const uiState: EodUiState = resolveEodUiState({
    pathname,
    reviewDue,
    savedReviewExists,
    modalOpen,
    skippedForToday,
    snoozed,
    modalShownForDate: storage.modalShownForDate,
    localDate,
    initialPlanVisitAfterDue: initialAfterDue,
    crossedThresholdOnPage: crossedOnPage,
  });

  const openReview = useCallback(() => {
    setModalOpen(true);
    setInitialAfterDue(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setCrossedOnPage(false);
    setInitialAfterDue(false);
  }, []);

  const snooze = useCallback(() => {
    const until = new Date(Date.now() + 60 * 60 * 1000);
    setSnoozeUntil(until.toISOString());
    refreshStorage();
    closeModal();
  }, [closeModal, refreshStorage]);

  const skipToday = useCallback(() => {
    setSkippedDate(localDate);
    refreshStorage();
    closeModal();
  }, [closeModal, localDate, refreshStorage]);

  const showBanner = uiState === "banner" && !nudgeQuiet;

  return {
    localDate,
    tzOffsetMinutes,
    modalOpen,
    uiState,
    showBanner,
    reviewDue,
    savedReviewExists,
    openReview,
    closeModal,
    snooze,
    skipToday,
    refreshStorage,
  };
}
