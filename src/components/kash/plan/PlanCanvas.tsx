"use client";

import { useEffect, useState } from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";

import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { usePlanMode } from "./PlanProvider";
import { DayPlanCanvas } from "./DayPlanCanvas";
import { WeekCanvas } from "./week/WeekCanvas";

export function PlanCanvas() {
  const { mode, mondayBlocked } = usePlanMode();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "?" && !(e.key === "/" && e.shiftKey)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      setShortcutsOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (mondayBlocked) {
    return <div className="min-h-[50vh]" aria-hidden />;
  }

  return (
    <>
      {mode === "week" ? <WeekCanvas /> : <DayPlanCanvas />}
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
