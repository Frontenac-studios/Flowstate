"use client";

import { useEffect, useState } from "react";

import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

function readLocalDate(now = new Date()): string {
  return toISODateString(startOfLocalDay(now));
}

function syncOnVisibility(fn: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === "visible") fn();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

/**
 * Local calendar day (YYYY-MM-DD), refreshed at midnight and when the tab regains focus.
 */
export function useLocalCalendarDate(): string {
  const [localDate, setLocalDate] = useState(() => readLocalDate());

  useEffect(() => {
    const sync = () => {
      const next = readLocalDate();
      setLocalDate((prev) => (prev === next ? prev : next));
    };

    sync();
    const intervalId = window.setInterval(sync, 60_000);
    const removeVisibility = syncOnVisibility(sync);
    return () => {
      window.clearInterval(intervalId);
      removeVisibility();
    };
  }, []);

  return localDate;
}

export type LocalCalendarClock = {
  localDate: string;
  /** Current time; refreshed when `localDate` changes (midnight / focus). */
  now: Date;
};

/**
 * Like {@link useLocalCalendarDate} but also exposes `now` for week partitioning and "today" UI.
 */
export function useLocalCalendarClock(): LocalCalendarClock {
  const [clock, setClock] = useState<LocalCalendarClock>(() => {
    const now = new Date();
    return { localDate: readLocalDate(now), now };
  });

  useEffect(() => {
    const sync = () => {
      const now = new Date();
      const localDate = readLocalDate(now);
      setClock((prev) => (prev.localDate === localDate ? prev : { localDate, now }));
    };

    sync();
    const intervalId = window.setInterval(sync, 60_000);
    const removeVisibility = syncOnVisibility(sync);
    return () => {
      window.clearInterval(intervalId);
      removeVisibility();
    };
  }, []);

  return clock;
}
