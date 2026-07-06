"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_FOCUS_BREAK_SECONDS,
  DEFAULT_FOCUS_WORK_SECONDS,
} from "@/lib/focus/resolve-focus-duration";

export type FocusSessionPhase = "work" | "break" | "postBreak";

type Options = {
  initialWorkSeconds?: number;
  initialBreakSeconds?: number;
  isPaused: boolean;
  onWorkSegmentEnd?: () => void;
};

export function useFocusSession({
  initialWorkSeconds = DEFAULT_FOCUS_WORK_SECONDS,
  initialBreakSeconds = DEFAULT_FOCUS_BREAK_SECONDS,
  isPaused,
  onWorkSegmentEnd,
}: Options) {
  const [phase, setPhase] = useState<FocusSessionPhase>("work");
  const [workTotalSeconds, setWorkTotalSeconds] = useState(initialWorkSeconds);
  const [workRemainingSeconds, setWorkRemainingSeconds] = useState(initialWorkSeconds);
  const [breakTotalSeconds, setBreakTotalSeconds] = useState(initialBreakSeconds);
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(initialBreakSeconds);
  const [workElapsedSeconds, setWorkElapsedSeconds] = useState(0);

  const onWorkSegmentEndRef = useRef(onWorkSegmentEnd);
  onWorkSegmentEndRef.current = onWorkSegmentEnd;

  const resetForNewTask = useCallback(
    (workSeconds: number, breakSeconds: number = DEFAULT_FOCUS_BREAK_SECONDS) => {
      setPhase("work");
      setWorkTotalSeconds(workSeconds);
      setWorkRemainingSeconds(workSeconds);
      setBreakTotalSeconds(breakSeconds);
      setBreakRemainingSeconds(breakSeconds);
      setWorkElapsedSeconds(0);
    },
    []
  );

  const setWorkDuration = useCallback((seconds: number) => {
    setWorkTotalSeconds(seconds);
    setWorkRemainingSeconds(seconds);
  }, []);

  const setBreakDuration = useCallback((seconds: number) => {
    setBreakTotalSeconds(seconds);
    setBreakRemainingSeconds(seconds);
  }, []);

  const skipBreak = useCallback(() => {
    setPhase("postBreak");
  }, []);

  const continueWork = useCallback(() => {
    setPhase("work");
    setWorkRemainingSeconds(workTotalSeconds);
  }, [workTotalSeconds]);

  useEffect(() => {
    if (phase === "postBreak") return;
    if (phase === "work" && isPaused) return;

    const id = window.setInterval(() => {
      if (phase === "work") {
        setWorkRemainingSeconds((prev) => {
          if (prev <= 1) {
            onWorkSegmentEndRef.current?.();
            setPhase("break");
            setBreakRemainingSeconds(breakTotalSeconds);
            return 0;
          }
          return prev - 1;
        });
        setWorkElapsedSeconds((e) => e + 1);
        return;
      }

      if (phase === "break") {
        setBreakRemainingSeconds((prev) => {
          if (prev <= 1) {
            setPhase("postBreak");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [phase, isPaused, breakTotalSeconds]);

  return {
    phase,
    workTotalSeconds,
    workRemainingSeconds,
    breakTotalSeconds,
    breakRemainingSeconds,
    workElapsedSeconds,
    setWorkDuration,
    setBreakDuration,
    skipBreak,
    continueWork,
    resetForNewTask,
  };
}
