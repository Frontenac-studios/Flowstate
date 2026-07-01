"use client";

import { useEffect, useState } from "react";

import { useWindDownHour } from "@/hooks/useWindDownHour";

function localHourNow(): number {
  return new Date().getHours();
}

/** True once the user's local clock reaches their wind-down hour. */
export function useWindDownDue(): boolean {
  const [windDownHour] = useWindDownHour();
  const [hour, setHour] = useState(localHourNow);

  useEffect(() => {
    const sync = () => setHour(localHourNow());
    sync();
    const id = window.setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return hour >= windDownHour;
}
