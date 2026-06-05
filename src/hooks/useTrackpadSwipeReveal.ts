"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SNAP_DEBOUNCE_MS = 120;

type Options = {
  maxOffset: number;
};

/**
 * Horizontal reveal driven by two-finger trackpad swipe (wheel events with dominant deltaX).
 */
export function useTrackpadSwipeReveal({ maxOffset }: Options) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setOffsetClamped = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(maxOffset, next));
      offsetRef.current = clamped;
      setOffset(clamped);
    },
    [maxOffset]
  );

  const hide = useCallback(() => setOffsetClamped(0), [setOffsetClamped]);

  const scheduleSnap = useCallback(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      setOffsetClamped(offsetRef.current >= maxOffset / 2 ? maxOffset : 0);
    }, SNAP_DEBOUNCE_MS);
  }, [maxOffset, setOffsetClamped]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();
      setOffsetClamped(offsetRef.current + e.deltaX);
      scheduleSnap();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scheduleSnap, setOffsetClamped]);

  useEffect(() => {
    if (offset === 0) return;

    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      hide();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [offset, hide]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  return { offset, hide, isOpen: offset > 0, containerRef };
}
