"use client";

import { useEffect, useMemo, useState } from "react";

import {
  HORIZON_OPTIONS,
  PLANNING_BREADCRUMB_STORAGE_KEY,
  PLANNING_HORIZON_STORAGE_KEY,
  type PlanningBreadcrumb,
  type PlanningHorizon,
} from "@/lib/planning/horizon-storage";

import { InPageSwitcher } from "../InPageSwitcher";
import BingoCard from "./bingo/BingoCard";
import PlanBreadcrumb from "./PlanBreadcrumb";
import PlanHorizonPlaceholder from "./PlanHorizonPlaceholder";

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
      raw === "bingo"
    ) {
      return raw;
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
 * breadcrumb zoom scaffold, and placeholder panels until parallel PRs land.
 */
export function PlanHorizonView() {
  const [horizon, setHorizon] = useState<PlanningHorizon>("year");
  const [breadcrumb, setBreadcrumb] = useState<PlanningBreadcrumb>(() => ({
    year: currentYear(),
  }));
  const [hydrated, setHydrated] = useState(false);

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

  const title = useMemo(() => {
    if (horizon === "bingo") return "Bingo";
    if (horizon === "year") return "Year";
    if (horizon === "quarter") return "Quarter";
    if (horizon === "month") return "Month";
    return "Week";
  }, [horizon]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-kash-ink">{title}</h1>
          {horizon !== "bingo" ? (
            <PlanBreadcrumb breadcrumb={breadcrumb} onNavigate={setBreadcrumb} />
          ) : null}
        </div>
        <InPageSwitcher
          options={HORIZON_OPTIONS}
          value={horizon}
          onChange={setHorizon}
          ariaLabel="Planning horizon"
        />
      </div>
      {horizon === "bingo" ? (
        <BingoCard year={breadcrumb.year} />
      ) : (
        <PlanHorizonPlaceholder horizon={horizon} />
      )}
    </div>
  );
}
