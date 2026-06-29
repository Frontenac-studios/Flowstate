"use client";

import { useState } from "react";

import { InPageSwitcher } from "../InPageSwitcher";

type CareActivity = "walks" | "breathing" | "reflections";

const CARE_OPTIONS = [
  { value: "walks", label: "Walks" },
  { value: "breathing", label: "Breathing" },
  { value: "reflections", label: "Reflections" },
] as const;

const CARE_COPY: Record<CareActivity, string> = {
  walks: "Walk prompts to step away and reset.",
  breathing: "Guided breathing to settle between blocks.",
  reflections: "Short reflections to keep you balanced.",
};

/**
 * Self-care surface. Real content is still to come — for now the shared in-page
 * switcher flips between placeholder activity panels so the Care page already
 * carries the Today/Plan/Care switcher pattern.
 */
export function CareView() {
  const [activity, setActivity] = useState<CareActivity>("walks");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-ink">Care</h1>
        <InPageSwitcher
          options={CARE_OPTIONS}
          value={activity}
          onChange={setActivity}
          ariaLabel="Care activity"
        />
      </div>
      <div className="rounded-card border border-subtle bg-surface p-8 text-ink-muted">
        <p className="text-sm">{CARE_COPY[activity]} Coming soon.</p>
      </div>
    </div>
  );
}
