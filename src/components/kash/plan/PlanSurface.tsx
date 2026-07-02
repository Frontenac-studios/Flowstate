"use client";

import { EodReviewRunner } from "../eod/EodReviewRunner";
import { EowReviewRunner } from "../eow/EowReviewRunner";
import { MondayEntryRunner } from "./MondayEntryRunner";
import { MorningHandoffRunner } from "./MorningHandoffRunner";
import { PlanProvider } from "./PlanProvider";
import { Top3RolloverRunner } from "./Top3RolloverRunner";

/**
 * Wraps the Today and Week surfaces with plan-mode state and the daily-loop
 * runners (Top-3 rollover, end-of-day review, Monday entry). These are scoped
 * here rather than in the global shell so they don't run on Projects, Settings,
 * Abyss, or Care. The triage inbox is mounted per-route via ContextualInbox.
 */
export function PlanSurface({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <Top3RolloverRunner />
      <EodReviewRunner />
      <EowReviewRunner />
      <MondayEntryRunner />
      <MorningHandoffRunner />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </PlanProvider>
  );
}
