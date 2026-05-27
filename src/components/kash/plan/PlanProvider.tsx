"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { isMondayBlockingRequired } from "@/lib/plan/is-monday-blocking-required";
import type { PlanMode } from "@/lib/plan/plan-mode-constants";
import {
  readPlanModeStorage,
  writeLastActiveAt,
  writeLastPlanMode,
  writeMondayChoiceDate,
} from "@/lib/plan/plan-mode-storage";
import { resolveInitialPlanMode } from "@/lib/plan/resolve-initial-plan-mode";

type PlanModeContextValue = {
  mode: PlanMode;
  setMode: (mode: PlanMode) => void;
  mondayBlocked: boolean;
  hydrated: boolean;
  resolveMondayChoice: (choice: "week" | "today") => void;
  touchActivity: () => void;
};

const PlanModeContext = createContext<PlanModeContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PlanMode>("day");
  const [mondayChoiceDate, setMondayChoiceDate] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const localDate = useLocalCalendarDate();

  useEffect(() => {
    const storage = readPlanModeStorage();
    const now = new Date();
    setModeState(resolveInitialPlanMode(now, storage));
    setMondayChoiceDate(storage.mondayChoiceDate);
    setHydrated(true);
  }, []);

  const touchActivity = useCallback(() => {
    writeLastActiveAt(new Date().toISOString());
  }, []);

  const setMode = useCallback(
    (next: PlanMode) => {
      setModeState(next);
      writeLastPlanMode(next);
      touchActivity();
    },
    [touchActivity]
  );

  const resolveMondayChoice = useCallback(
    (choice: "week" | "today") => {
      writeMondayChoiceDate(localDate);
      setMondayChoiceDate(localDate);
      setMode(choice === "week" ? "week" : "day");
      touchActivity();
    },
    [localDate, setMode, touchActivity]
  );

  const mondayBlocked = useMemo(() => {
    if (!hydrated) {
      return isMondayBlockingRequired(localDate, null);
    }
    return isMondayBlockingRequired(localDate, mondayChoiceDate);
  }, [hydrated, localDate, mondayChoiceDate]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      mondayBlocked,
      hydrated,
      resolveMondayChoice,
      touchActivity,
    }),
    [mode, setMode, mondayBlocked, hydrated, resolveMondayChoice, touchActivity]
  );

  return <PlanModeContext.Provider value={value}>{children}</PlanModeContext.Provider>;
}

export function usePlanMode(): PlanModeContextValue {
  const ctx = useContext(PlanModeContext);
  if (!ctx) {
    throw new Error("usePlanMode must be used within PlanProvider");
  }
  return ctx;
}
