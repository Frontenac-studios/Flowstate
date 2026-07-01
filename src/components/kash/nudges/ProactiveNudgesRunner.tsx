"use client";

import EssentialNudgeChip from "@/components/kash/nudges/EssentialNudgeChip";
import { useEssentialNudges } from "@/hooks/useEssentialNudges";

/** Mount inside ChatProvider on /today, /plan, and /today/focus. */
export function ProactiveNudgesRunner() {
  const { chips, dismissChip, handleAction } = useEssentialNudges();

  if (chips.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[var(--space-6)] left-[calc(var(--space-6)+4.5rem)] z-overlay flex max-w-md flex-col gap-[var(--space-2)] lg:left-[calc(var(--space-10)+4.5rem)]"
      aria-live="polite"
    >
      {chips.map((chip) => (
        <div key={chip.kind} className="pointer-events-auto">
          <EssentialNudgeChip
            kind={chip.kind}
            message={chip.message}
            onAction={() => handleAction(chip.kind)}
            onDismiss={() => dismissChip(chip.kind)}
          />
        </div>
      ))}
    </div>
  );
}
