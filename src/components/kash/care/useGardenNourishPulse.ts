"use client";

import { useEffect, useRef, useState } from "react";

import type { GardenNourishBeat } from "@/lib/care/garden-nourish";

type Nourishment = {
  id: string;
  beat: GardenNourishBeat;
};

/**
 * Plays garden-nourish animation for win events not yet celebrated in this session.
 * Celebration is Care-only (AN-B4); reduced motion falls back via CSS.
 */
export function useGardenNourishPulse(nourishments: Nourishment[] | undefined) {
  const seenRef = useRef<Set<string>>(new Set());
  const [activeBeat, setActiveBeat] = useState<GardenNourishBeat | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (!nourishments?.length) return;

    const unseen = nourishments.filter((item) => !seenRef.current.has(item.id));
    if (unseen.length === 0) return;

    const latest = unseen[0];
    for (const item of unseen) {
      seenRef.current.add(item.id);
    }

    setActiveBeat(latest.beat);
    setPulseKey((key) => key + 1);

    const timer = window.setTimeout(() => setActiveBeat(null), 700);
    return () => window.clearTimeout(timer);
  }, [nourishments]);

  return { activeBeat, pulseKey };
}
