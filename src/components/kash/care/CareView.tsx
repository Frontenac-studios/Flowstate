"use client";

import { useState } from "react";

import { InPageSwitcher } from "../InPageSwitcher";

import { CareComingSoon } from "./CareComingSoon";
import { CareGardenHome } from "./CareGardenHome";
import { CARE_SUBTITLES, CARE_TABS, type CareTab } from "./care-tabs";

/**
 * Care hub — the garden-centric home plus the §12 top tabs
 * (Garden · Tasks · Breathing · Reflection · Stats · Travel). The active tab is
 * the shared in-page switcher's inset white pill. Garden is built; the other
 * tabs are calm "coming soon" landings until their features ship.
 */
export function CareView() {
  const [tab, setTab] = useState<CareTab>("garden");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-medium text-ink">Care</h1>
        <p className="text-meta text-ink-faint">{CARE_SUBTITLES[tab]}</p>
      </div>

      <InPageSwitcher options={CARE_TABS} value={tab} onChange={setTab} ariaLabel="Care section" />

      {tab === "garden" ? <CareGardenHome /> : <CareComingSoon tab={tab} />}
    </section>
  );
}
