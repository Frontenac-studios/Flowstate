import type { LucideIcon } from "lucide-react";

import { BookText, Wind, withKashIcon } from "@/components/kash/ui/icon";

import type { SwitcherOption } from "../InPageSwitcher";

/**
 * Care sub-sections (D33 / V13). Four tabs: Garden · Tasks · Breathing ·
 * Reflection. Legacy ?tab=wins|stats|travel redirect in resolveCareTab — the
 * Evidence tab was removed with the Daily Wins / Evidence features.
 */
export type CareTab = "garden" | "tasks" | "breathing" | "reflection";

/** Legacy tab values kept for deep-link redirects only. */
export type LegacyCareTab = "wins" | "stats" | "travel";

export const CARE_TABS: ReadonlyArray<SwitcherOption<CareTab>> = [
  { value: "garden", label: "Garden" },
  { value: "tasks", label: "Tasks" },
  { value: "breathing", label: "Breathing" },
  { value: "reflection", label: "Reflection" },
];

/** A gentle one-line subtitle under the "Care" heading, per active tab. */
export const CARE_SUBTITLES: Record<CareTab, string> = {
  garden: "A calm place to tend yourself",
  tasks: "Self-care practices — yours, and ones to try",
  breathing: "Settle your breath",
  reflection: "A moment to reflect",
};

const BreathingIcon = withKashIcon(Wind);
const ReflectionIcon = withKashIcon(BookText);

/**
 * Copy + icon for tabs whose features ship in later slices. The Garden home is
 * built now, so it has no "coming soon" entry.
 */
export const CARE_COMING_SOON: Record<
  Exclude<CareTab, "garden" | "tasks">,
  { title: string; copy: string; Icon: LucideIcon }
> = {
  breathing: {
    title: "Breathing",
    copy: "Guided breathing with a pulsing orb — box breathing and more.",
    Icon: BreathingIcon,
  },
  reflection: {
    title: "Reflection",
    copy: "A gentle nightly prompt, space to write, and your reflections archive.",
    Icon: ReflectionIcon,
  },
};

/** Map legacy ?tab= values to the V13 tab lineup (D33). */
export function resolveCareTab(requested: string | null): CareTab {
  if (requested === "wins" || requested === "stats" || requested === "travel") return "garden";
  if (
    requested === "garden" ||
    requested === "tasks" ||
    requested === "breathing" ||
    requested === "reflection"
  ) {
    return requested;
  }
  return "garden";
}
