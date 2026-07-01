"use client";

import { useCallback, useEffect, useState } from "react";

import {
  defaultWeekWindDown,
  readWeekWindDown,
  WEEK_WIND_DOWN_EVENT,
  writeWeekWindDown,
  type WeekWindDown,
} from "@/lib/eow/week-wind-down";

/** Week wind-down day + hour, synced across readers on the page. */
export function useWeekWindDown(): [WeekWindDown, (next: WeekWindDown) => void] {
  const [value, setValue] = useState<WeekWindDown>(() => defaultWeekWindDown());

  useEffect(() => {
    const sync = () => setValue(readWeekWindDown());
    sync();
    window.addEventListener(WEEK_WIND_DOWN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WEEK_WIND_DOWN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((next: WeekWindDown) => writeWeekWindDown(next), []);

  return [value, set];
}
