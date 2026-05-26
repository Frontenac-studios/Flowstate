"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSessionUndo } from "@/hooks/useSessionUndo";

import { QuickInput, type QuickInputHandle } from "./QuickInput";
import { TodayList } from "./TodayList";

export function PlanCanvas() {
  const quickInputRef = useRef<QuickInputHandle>(null);
  const [pulseToday, setPulseToday] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pushComplete, pushDelete } = useSessionUndo();

  const triggerPulse = useCallback(() => {
    setPulseToday(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulseToday(false), 1500);
  }, []);

  useEffect(() => {
    quickInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      quickInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  return (
    <>
      <QuickInput ref={quickInputRef} onTaskCreated={triggerPulse} />
      <TodayList pulse={pulseToday} onComplete={pushComplete} onDelete={pushDelete} />
    </>
  );
}
