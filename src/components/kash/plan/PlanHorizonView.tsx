"use client";

import { useState } from "react";

import { InPageSwitcher } from "../InPageSwitcher";

type Horizon = "month" | "quarter" | "year";

const HORIZON_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
] as const;

const HORIZON_COPY: Record<Horizon, string> = {
  month: "Monthly planning lands here.",
  quarter: "Quarterly planning lands here.",
  year: "Yearly planning lands here.",
};

/**
 * Long-horizon planning surface. Real content is still to come — for now the
 * shared in-page switcher flips between placeholder horizon panels so the Plan
 * page already carries the Today/Plan/Care switcher pattern.
 */
export function PlanHorizonView() {
  const [horizon, setHorizon] = useState<Horizon>("month");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-kash-ink">Plan</h1>
        <InPageSwitcher
          options={HORIZON_OPTIONS}
          value={horizon}
          onChange={setHorizon}
          ariaLabel="Planning horizon"
        />
      </div>
      <div className="glass-panel p-8 text-kash-ink-muted">
        <p className="text-sm">{HORIZON_COPY[horizon]} Coming soon.</p>
      </div>
    </div>
  );
}
