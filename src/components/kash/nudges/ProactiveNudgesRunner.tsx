"use client";

import EssentialNudgeChip from "@/components/kash/nudges/EssentialNudgeChip";
import { useEssentialNudges } from "@/hooks/useEssentialNudges";

/**
 * Essential-nudge chip runner. Mounted via `AppShell proactiveNudges` on
 * /today, /plan and /care, and directly in the /today/focus layout.
 */
export function ProactiveNudgesRunner() {
  const { chip, dismiss, handleAction } = useEssentialNudges();

  if (!chip) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[var(--space-6)] left-[calc(var(--space-6)+4.5rem)] z-overlay flex max-w-md flex-col gap-[var(--space-2)] lg:left-[calc(var(--space-10)+4.5rem)]"
      aria-live="polite"
    >
      <div className="pointer-events-auto">
        <EssentialNudgeChip
          kind={chip.kind}
          message={chip.message}
          categoryTint={chip.categoryTint}
          onAction={() => handleAction(chip)}
          onDismiss={() => dismiss(chip.kind)}
        />
      </div>
    </div>
  );
}
