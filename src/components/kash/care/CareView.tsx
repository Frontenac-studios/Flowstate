"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { InPageSwitcher } from "../InPageSwitcher";

import { CareBreathing } from "./CareBreathing";
import { CareEvidence } from "./CareEvidence";
import { CareGardenHome } from "./CareGardenHome";
import { CareReflection } from "./CareReflection";
import { CareTasks } from "./CareTasks";
import { CARE_SUBTITLES, CARE_TABS, resolveCareTab, type CareTab } from "./care-tabs";

export function CareView() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CareTab>("garden");

  useEffect(() => {
    setTab(resolveCareTab(searchParams.get("tab")));
  }, [searchParams]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Care</h1>
        <p className="text-meta text-ink-faint">{CARE_SUBTITLES[tab]}</p>
      </div>

      <InPageSwitcher options={CARE_TABS} value={tab} onChange={setTab} ariaLabel="Care section" />

      {tab === "garden" ? (
        <CareGardenHome onOpenBreathing={() => setTab("breathing")} />
      ) : tab === "evidence" ? (
        <CareEvidence />
      ) : tab === "tasks" ? (
        <CareTasks />
      ) : tab === "breathing" ? (
        <CareBreathing />
      ) : (
        <CareReflection />
      )}
    </section>
  );
}
