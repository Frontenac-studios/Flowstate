"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BalancePassProvider, {
  useBalancePassTrigger,
} from "@/components/kash/plan/balance/BalancePassProvider";
import CheckInProvider, { CheckInEntry } from "@/components/kash/plan/check-in/CheckInProvider";

import {
  horizonForBreadcrumb,
  trimBreadcrumbForHorizon,
  zoomToMonth,
  zoomToQuarter,
} from "@/lib/planning/horizon-nav";
import {
  deriveIsoWeekForBreadcrumb,
  isWeekBreadcrumbScoped,
  resolveWeekAnchorDate,
} from "@/lib/planning/week-breadcrumb";
import {
  HORIZON_OPTIONS,
  PLANNING_BREADCRUMB_STORAGE_KEY,
  PLANNING_HORIZON_STORAGE_KEY,
  type PlanningBreadcrumb,
  type PlanningHorizon,
} from "@/lib/planning/horizon-storage";

import { InPageSwitcher } from "../InPageSwitcher";
import PlanBreadcrumb from "./PlanBreadcrumb";
import PlanHorizonPlaceholder from "./PlanHorizonPlaceholder";

const BingoCard = dynamic(() => import("./bingo/BingoCard"), {
  loading: () => <PlanHorizonPlaceholder horizon="goals" />,
});
const BingoYearRolloverNudges = dynamic(() => import("./bingo/BingoYearRolloverNudges"), {
  ssr: false,
});
const MonthView = dynamic(() => import("./month/MonthView"), {
  loading: () => <PlanHorizonPlaceholder horizon="month" />,
});
const QuarterView = dynamic(() => import("./quarter/QuarterView"), {
  loading: () => <PlanHorizonPlaceholder horizon="quarter" />,
});
const WeekPlanView = dynamic(() => import("./week/WeekPlanView"), {
  loading: () => <PlanHorizonPlaceholder horizon="week" />,
});
const YearView = dynamic(() => import("./year/YearView"), {
  loading: () => <PlanHorizonPlaceholder horizon="year" />,
});

function currentYear(): number {
  return new Date().getFullYear();
}

function readStoredHorizon(): PlanningHorizon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLANNING_HORIZON_STORAGE_KEY);
    if (
      raw === "week" ||
      raw === "month" ||
      raw === "quarter" ||
      raw === "year" ||
      raw === "goals" ||
      raw === "bingo"
    ) {
      return raw === "bingo" ? "goals" : raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readStoredBreadcrumb(): PlanningBreadcrumb | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLANNING_BREADCRUMB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanningBreadcrumb;
    if (typeof parsed.year === "number") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredHorizon(horizon: PlanningHorizon) {
  try {
    window.localStorage.setItem(PLANNING_HORIZON_STORAGE_KEY, horizon);
  } catch {
    /* ignore */
  }
}

function writeStoredBreadcrumb(breadcrumb: PlanningBreadcrumb) {
  try {
    window.localStorage.setItem(PLANNING_BREADCRUMB_STORAGE_KEY, JSON.stringify(breadcrumb));
  } catch {
    /* ignore */
  }
}

/**
 * Long-horizon planning shell: Week · Month · Quarter · Year · Bingo switcher,
 * breadcrumb zoom scaffold, and horizon views.
 */
export function PlanHorizonView() {
  return (
    <BalancePassProvider>
      <PlanHorizonViewInner />
    </BalancePassProvider>
  );
}

function PlanHorizonViewInner() {
  const [horizon, setHorizon] = useState<PlanningHorizon>("year");
  const [breadcrumb, setBreadcrumb] = useState<PlanningBreadcrumb>(() => ({
    year: currentYear(),
  }));
  const [hydrated, setHydrated] = useState(false);
  const triggerBalancePass = useBalancePassTrigger();
  const prevHorizonRef = useRef<PlanningHorizon>("year");
  const breadcrumbRef = useRef(breadcrumb);
  breadcrumbRef.current = breadcrumb;

  useEffect(() => {
    const storedHorizon = readStoredHorizon();
    const storedBreadcrumb = readStoredBreadcrumb();
    if (storedHorizon) setHorizon(storedHorizon);
    if (storedBreadcrumb) setBreadcrumb(storedBreadcrumb);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredHorizon(horizon);
  }, [horizon, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredBreadcrumb(breadcrumb);
  }, [breadcrumb, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const prev = prevHorizonRef.current;
    const bc = breadcrumbRef.current;
    const tzOffsetMinutes = new Date().getTimezoneOffset();

    if (prev === "week" && horizon !== "week" && isWeekBreadcrumbScoped(bc)) {
      triggerBalancePass?.({
        horizon: "week",
        year: bc.year,
        month: bc.month,
        quarter: bc.quarter,
        weekStart: resolveWeekAnchorDate(bc),
        tzOffsetMinutes,
      });
    }

    if (prev === "month" && horizon !== "month" && bc.month != null) {
      triggerBalancePass?.({
        horizon: "month",
        year: bc.year,
        month: bc.month,
        quarter: bc.quarter,
        tzOffsetMinutes,
      });
    }

    prevHorizonRef.current = horizon;
  }, [horizon, hydrated, triggerBalancePass]);

  const handleBreadcrumbNavigate = useCallback((next: PlanningBreadcrumb) => {
    setBreadcrumb(next);
    setHorizon(horizonForBreadcrumb(next));
  }, []);

  const handleHorizonChange = useCallback((next: PlanningHorizon) => {
    setHorizon(next);
    if (next !== "goals") {
      setBreadcrumb((prev) => {
        const trimmed = trimBreadcrumbForHorizon(prev, next);
        if (next === "week" && trimmed.isoWeek == null && isWeekBreadcrumbScoped(trimmed)) {
          return { ...trimmed, isoWeek: deriveIsoWeekForBreadcrumb(trimmed) };
        }
        return trimmed;
      });
    }
  }, []);

  const handleZoomQuarter = useCallback(
    (quarter: number) => {
      setBreadcrumb(zoomToQuarter(breadcrumb.year, quarter));
      setHorizon("quarter");
    },
    [breadcrumb.year]
  );

  const handleZoomMonth = useCallback(
    (month: number) => {
      const quarter = breadcrumb.quarter ?? Math.ceil(month / 3);
      setBreadcrumb(zoomToMonth(breadcrumb.year, quarter, month));
      setHorizon("month");
    },
    [breadcrumb.year, breadcrumb.quarter]
  );

  const title = useMemo(() => {
    if (horizon === "goals") return "Goals";
    if (horizon === "year") return "Year";
    if (horizon === "quarter") return "Quarter";
    if (horizon === "month") return "Month";
    return "Week";
  }, [horizon]);

  const showQuarterDrill = horizon === "quarter" && breadcrumb.quarter != null;
  const showMonthDrill = horizon === "month" && breadcrumb.month != null;
  const showWeekPlan = horizon === "week" && isWeekBreadcrumbScoped(breadcrumb);
  const showPlaceholder =
    (horizon === "week" && !showWeekPlan) ||
    (horizon === "month" && breadcrumb.month == null) ||
    (horizon === "quarter" && breadcrumb.quarter == null);

  const showYearRolloverNudges = horizon === "goals" || horizon === "year";

  const handleStartNextYearBingo = useCallback((year: number) => {
    setBreadcrumb({ year });
    setHorizon("goals");
  }, []);

  const handleOpenBingo = useCallback((year: number) => {
    setBreadcrumb({ year });
    setHorizon("goals");
  }, []);

  return (
    <CheckInProvider breadcrumb={breadcrumb}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-semibold text-ink">{title}</h1>
            {horizon !== "goals" ? (
              <PlanBreadcrumb breadcrumb={breadcrumb} onNavigate={handleBreadcrumbNavigate} />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CheckInEntry />
            <InPageSwitcher
              options={HORIZON_OPTIONS}
              value={horizon}
              onChange={handleHorizonChange}
              ariaLabel="Planning horizon"
            />
          </div>
        </div>
        {showYearRolloverNudges ? (
          <BingoYearRolloverNudges
            onStartNextYear={handleStartNextYearBingo}
            onOpenBingo={handleOpenBingo}
          />
        ) : null}
        <PlanHorizonContent
          horizon={horizon}
          breadcrumb={breadcrumb}
          showQuarterDrill={showQuarterDrill}
          showMonthDrill={showMonthDrill}
          showWeekPlan={showWeekPlan}
          showPlaceholder={showPlaceholder}
          onZoomQuarter={handleZoomQuarter}
          onZoomMonth={handleZoomMonth}
        />
      </div>
    </CheckInProvider>
  );
}

type HorizonContentProps = {
  horizon: PlanningHorizon;
  breadcrumb: PlanningBreadcrumb;
  showQuarterDrill: boolean;
  showMonthDrill: boolean;
  showWeekPlan: boolean;
  showPlaceholder: boolean;
  onZoomQuarter: (quarter: number) => void;
  onZoomMonth: (month: number) => void;
};

function PlanHorizonContent({
  horizon,
  breadcrumb,
  showQuarterDrill,
  showMonthDrill,
  showWeekPlan,
  showPlaceholder,
  onZoomQuarter,
  onZoomMonth,
}: HorizonContentProps) {
  const contentKey = [
    horizon,
    breadcrumb.year,
    breadcrumb.quarter,
    breadcrumb.month,
    breadcrumb.isoWeek,
  ].join("-");

  return (
    <div key={contentKey} className="plan-zoom-enter">
      {horizon === "goals" ? (
        <BingoCard year={breadcrumb.year} />
      ) : horizon === "year" ? (
        <YearView year={breadcrumb.year} onZoomQuarter={onZoomQuarter} />
      ) : showQuarterDrill ? (
        <QuarterView
          year={breadcrumb.year}
          quarter={breadcrumb.quarter!}
          onZoomMonth={onZoomMonth}
        />
      ) : showMonthDrill ? (
        <MonthView year={breadcrumb.year} month={breadcrumb.month!} />
      ) : showWeekPlan ? (
        <WeekPlanView breadcrumb={breadcrumb} />
      ) : showPlaceholder ? (
        <PlanHorizonPlaceholder horizon={horizon} />
      ) : null}
    </div>
  );
}
