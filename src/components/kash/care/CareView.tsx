"use client";

import { useState } from "react";

import { InPageSwitcher } from "../InPageSwitcher";

import { CareBreathing } from "./CareBreathing";
import { CareGardenHome } from "./CareGardenHome";
import { CareReflection } from "./CareReflection";
import { CareStats } from "./CareStats";
import { CareTasks } from "./CareTasks";
import { CareTravel } from "./CareTravel";
import { CARE_SUBTITLES, CARE_TABS, type CareTab } from "./care-tabs";

export function CareView() {
  const [tab, setTab] = useState<CareTab>("garden");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-medium text-ink">Care</h1>
        <p className="text-meta text-ink-faint">{CARE_SUBTITLES[tab]}</p>
      </div>

      <InPageSwitcher options={CARE_TABS} value={tab} onChange={setTab} ariaLabel="Care section" />

      {tab === "garden" ? (
        <CareGardenHome onOpenBreathing={() => setTab("breathing")} />
      ) : tab === "tasks" ? (
        <CareTasks />
      ) : tab === "breathing" ? (
        <CareBreathing />
      ) : tab === "reflection" ? (
        <CareReflection />
      ) : tab === "stats" ? (
        <CareStats />
      ) : (
        <CareTravel />
      )}
    </section>
  );
}
