"use client";

import { KashHeader } from "../KashHeader";

export function PlanMainColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <KashHeader />
      {children}
    </div>
  );
}
