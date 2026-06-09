"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SNAP_DEBOUNCE_MS = 120;

type Options = {
  /** @deprecated Use maxOffsetRight instead. */
  maxOffset?: number;
  maxOffsetRight?: number;
  maxOffsetLeft?: number;
};

/**
 * Horizontal reveal driven by two-finger trackpad swipe (wheel events with dominant deltaX).
 * Positive deltaX reveals right-side actions; negative deltaX reveals left-side actions.
 */
export function useTrackpadSwipeReveal({ maxOffset, maxOffsetRight, maxOffsetLeft = 0 }: Options) {
  const resolvedMaxRight = maxOffsetRight ?? maxOffset ?? 0;
  const resolvedMaxLeft = maxOffsetLeft;

  const [leftOffset, setLeftOffset] = useState(0);
  const [rightOffset, setRightOffset] = useState(0);
  const leftRef = useRef(0);
  const rightRef = useRef(0);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setLeftClamped = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(resolvedMaxLeft, next));
      leftRef.current = clamped;
      setLeftOffset(clamped);
    },
    [resolvedMaxLeft]
  );

  const setRightClamped = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(resolvedMaxRight, next));
      rightRef.current = clamped;
      setRightOffset(clamped);
    },
    [resolvedMaxRight]
  );

  const hide = useCallback(() => {
    setLeftClamped(0);
    setRightClamped(0);
  }, [setLeftClamped, setRightClamped]);

  const scheduleSnap = useCallback(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      const snapLeft =
        resolvedMaxLeft > 0 && leftRef.current >= resolvedMaxLeft / 2 ? resolvedMaxLeft : 0;
      const snapRight =
        resolvedMaxRight > 0 && rightRef.current >= resolvedMaxRight / 2 ? resolvedMaxRight : 0;

      if (snapLeft > 0 && snapRight > 0) {
        if (leftRef.current >= rightRef.current) {
          setRightClamped(0);
          setLeftClamped(snapLeft);
        } else {
          setLeftClamped(0);
          setRightClamped(snapRight);
        }
        return;
      }

      setLeftClamped(snapLeft);
      setRightClamped(snapRight);
    }, SNAP_DEBOUNCE_MS);
  }, [resolvedMaxLeft, resolvedMaxRight, setLeftClamped, setRightClamped]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.deltaX > 0) {
        setRightClamped(rightRef.current + e.deltaX);
        if (leftRef.current > 0) setLeftClamped(0);
      } else {
        setLeftClamped(leftRef.current - e.deltaX);
        if (rightRef.current > 0) setRightClamped(0);
      }

      scheduleSnap();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scheduleSnap, setLeftClamped, setRightClamped]);

  const isOpen = leftOffset > 0 || rightOffset > 0;

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      hide();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, hide]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  const netOffset = leftOffset - rightOffset;

  return {
    leftOffset,
    rightOffset,
    offset: netOffset,
    hide,
    isOpen,
    isLeftOpen: leftOffset > 0,
    isRightOpen: rightOffset > 0,
    containerRef,
  };
}
