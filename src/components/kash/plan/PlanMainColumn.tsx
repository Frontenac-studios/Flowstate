"use client";

import { KashHeader } from "../KashHeader";
import { usePlanMode } from "./PlanProvider";

export function PlanMainColumn({ children }: { children: React.ReactNode }) {
  const { mode } = usePlanMode();

  return (
    <div
      className={
        mode === "week"
          ? "min-w-0 max-w-[min(100%,90rem)] flex-1"
          : "min-w-0 max-w-[min(100%,72rem)] flex-1"
      }
    >
      <KashHeader />
      {children}
    </div>
  );
}
