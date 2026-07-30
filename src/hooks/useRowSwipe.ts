"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clamp,
  shouldTriggerComplete,
  snapReveal,
  SWIPE_FLING_MAX_PX,
} from "@/lib/gestures/row-swipe";

const SNAP_DEBOUNCE_MS = 120;
/** A pointer drag past this many px is a swipe, not a tap — used to suppress the click. */
const TAP_SLOP_PX = 8;

type Options = {
  /** Width of the left-swipe Edit/Delete reveal rail. */
  revealWidth: number;
  /** Fired when a rightward swipe crosses the completion threshold. */
  onSwipeComplete: () => void;
  /** Disable the complete fling (e.g. a blocked task); the reveal rail still works. */
  completeDisabled?: boolean;
};

/**
 * The D1/D6 directional row gesture. Swipe **left** reveals a persistent
 * Edit/Delete rail (`revealOffset`, snaps open past half); swipe **right** is a
 * momentary complete fling (`flingOffset`, springs back after firing
 * `onSwipeComplete` past the threshold). Driven by two-finger trackpad wheel and
 * one-finger pointer/touch — the latter is safe here because the row's drag
 * activator is the handle, not the body. `consumeSwipe()` lets the row suppress
 * the click that a pointer swipe would otherwise fire (tap vs swipe).
 */
export function useRowSwipe({ revealWidth, onSwipeComplete, completeDisabled = false }: Options) {
  const [revealOffset, setRevealOffset] = useState(0);
  const [flingOffset, setFlingOffset] = useState(0);
  const revealRef = useRef(0);
  const flingRef = useRef(0);
  const firedRef = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Set true once a pointer drag passes the tap slop, so the trailing click is a
  // swipe (suppress select) rather than a tap; read + reset via `consumeSwipe`.
  const swipedRef = useRef(false);

  const setReveal = useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, revealWidth);
      revealRef.current = clamped;
      setRevealOffset(clamped);
    },
    [revealWidth]
  );

  const setFling = useCallback((next: number) => {
    const clamped = clamp(next, 0, SWIPE_FLING_MAX_PX);
    flingRef.current = clamped;
    setFlingOffset(clamped);
  }, []);

  const hide = useCallback(() => {
    setReveal(0);
    setFling(0);
  }, [setReveal, setFling]);

  const tryComplete = useCallback(() => {
    if (completeDisabled || firedRef.current) return false;
    if (!shouldTriggerComplete(flingRef.current)) return false;
    firedRef.current = true;
    onSwipeComplete();
    return true;
  }, [completeDisabled, onSwipeComplete]);

  const scheduleSettle = useCallback(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      // The fling never rests open: fire complete if past threshold (a no-op when
      // already fired mid-gesture or disabled), then always spring back — on a
      // real completion the row's own slide-out takes over the visual. The reveal
      // rail snaps open/closed at the halfway point.
      if (flingRef.current > 0) {
        tryComplete();
        setFling(0);
      }
      setReveal(snapReveal(revealRef.current, revealWidth));
      firedRef.current = false;
    }, SNAP_DEBOUNCE_MS);
  }, [revealWidth, setFling, setReveal, tryComplete]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.deltaX > 0) {
        // Rightward → complete fling.
        if (revealRef.current > 0) setReveal(0);
        setFling(flingRef.current + e.deltaX);
        tryComplete();
      } else {
        // Leftward → reveal Edit/Delete rail.
        if (flingRef.current > 0) setFling(0);
        setReveal(revealRef.current - e.deltaX);
      }
      scheduleSettle();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scheduleSettle, setFling, setReveal, tryComplete]);

  // One-finger pointer / touch drag. Safe on the row body because dnd's drag
  // activator is the handle. Horizontal intent only — vertical drags are left to
  // the page / dnd.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let active = false;
    let horizontal = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return; // mouse uses right-click menu, not drag
      startX = e.clientX;
      startY = e.clientY;
      active = true;
      horizontal = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!horizontal) {
        if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          active = false; // vertical → not our gesture
          return;
        }
        horizontal = true;
        swipedRef.current = true;
      }
      if (dx > 0) {
        setReveal(0);
        setFling(dx);
      } else {
        setFling(0);
        setReveal(-dx);
      }
    };

    const onPointerEnd = () => {
      if (!active) return;
      active = false;
      if (!horizontal) return;
      if (flingRef.current > 0) {
        tryComplete();
        setFling(0);
      }
      setReveal(snapReveal(revealRef.current, revealWidth));
      firedRef.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [revealWidth, setFling, setReveal, tryComplete]);

  const isRevealOpen = revealOffset > 0;

  useEffect(() => {
    if (!isRevealOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      hide();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isRevealOpen, hide]);

  useEffect(
    () => () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    },
    []
  );

  /** True (once) if the last pointer interaction was a swipe — suppress the click. */
  const consumeSwipe = useCallback(() => {
    if (!swipedRef.current) return false;
    swipedRef.current = false;
    return true;
  }, []);

  return {
    revealOffset,
    flingOffset,
    isRevealOpen,
    hide,
    consumeSwipe,
    containerRef,
  };
}
