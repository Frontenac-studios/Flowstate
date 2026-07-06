"use client";

import { useRouter } from "next/navigation";

import Button from "@/components/kash/ui/Button";
import { RitualSheet } from "@/components/kash/ui/RitualSheet";

import { usePlanMode } from "./PlanProvider";

export function MondayEntryModal() {
  const router = useRouter();
  const { mondayBlocked, resolveMondayChoice } = usePlanMode();

  if (!mondayBlocked) return null;

  // Week planning now lives on its own route (This Week); record the Monday
  // choice (so the prompt doesn't reappear) and hand off there.
  const planTheWeek = () => {
    resolveMondayChoice("week");
    router.push("/this-week");
  };

  return (
    <RitualSheet
      open
      title="Good morning"
      dismissOnBackdrop={false}
      footer={
        <div className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:justify-end">
          <Button type="button" variant="primary" className="text-body" onClick={planTheWeek}>
            Plan the week
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-body"
            onClick={() => resolveMondayChoice("today")}
          >
            Jump into today
          </Button>
        </div>
      }
    >
      <div className="space-y-[var(--space-3)]">
        <p className="text-body font-medium text-ink">Plan the week or dive into today?</p>
        <p className="text-body text-ink-muted">
          Choose how you want to start Monday. You can switch anytime from the sidebar.
        </p>
      </div>
    </RitualSheet>
  );
}
