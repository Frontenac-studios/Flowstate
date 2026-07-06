"use client";

import { usePathname } from "next/navigation";

import EssentialNudgeChip from "@/components/kash/nudges/EssentialNudgeChip";
import { useEssentialNudges } from "@/hooks/useEssentialNudges";

/**
 * Proactive nudges are only surfaced on the planning-focused surfaces:
 * /today (incl. /today/focus), /plan, and /care. The runner self-gates on the
 * current path so it can be mounted unconditionally inside the shared AppShell —
 * the nudge-evaluation hook only runs when the path is enabled.
 */
const NUDGE_PATH_PREFIXES = ["/today", "/plan", "/care"];

export function ProactiveNudgesRunner() {
  const pathname = usePathname();
  const enabled = NUDGE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!enabled) return null;

  return <ActiveNudges />;
}

function ActiveNudges() {
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
