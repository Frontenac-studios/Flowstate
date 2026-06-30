"use client";

import { useCallback, useEffect, useState } from "react";

import {
  defaultWindDownHour,
  readWindDownHour,
  WIND_DOWN_EVENT,
  writeWindDownHour,
} from "@/lib/eod/wind-down";

/**
 * The user's wind-down hour, kept in sync across every reader on the page (the
 * Top-3 deadline label and the EoD review trigger). Starts at the default for a
 * clean SSR/first-paint, then reads the stored value on mount; updates whenever
 * any component changes it (custom event) or another tab writes it (storage).
 */
export function useWindDownHour(): [number, (hour: number) => void] {
  const [hour, setHour] = useState<number>(() => defaultWindDownHour());

  useEffect(() => {
    const sync = () => setHour(readWindDownHour());
    sync();
    window.addEventListener(WIND_DOWN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WIND_DOWN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((next: number) => writeWindDownHour(next), []);

  return [hour, set];
}
