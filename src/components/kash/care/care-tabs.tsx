import type { LucideIcon } from "lucide-react";

import { BarChart3, BookText, List, Mountain, Wind, withKashIcon } from "@/components/kash/ui/icon";

import type { SwitcherOption } from "../InPageSwitcher";

/**
 * Care sub-sections (§12 "Care — RESOLVED"). The Garden is the garden-centric
 * home; the rest are top tabs. Icons use the shared Kash icon module (lucide +
 * token sizes) for the "coming soon" landings — the top tabs themselves are
 * text-only pills.
 */
export type CareTab = "garden" | "tasks" | "breathing" | "reflection" | "stats" | "travel";

export const CARE_TABS: ReadonlyArray<SwitcherOption<CareTab>> = [
  { value: "garden", label: "Garden" },
  { value: "tasks", label: "Tasks" },
  { value: "breathing", label: "Breathing" },
  { value: "reflection", label: "Reflection" },
  { value: "stats", label: "Stats" },
  { value: "travel", label: "Travel" },
];

/** A gentle one-line subtitle under the "Care" heading, per active tab. */
export const CARE_SUBTITLES: Record<CareTab, string> = {
  garden: "A calm place to tend yourself",
  tasks: "Self-care practices — yours, and ones to try",
  breathing: "Settle your breath",
  reflection: "A moment to reflect",
  stats: "Gently, how you've been",
  travel: "Plan some restorative time",
};

const TasksIcon = withKashIcon(List);
const BreathingIcon = withKashIcon(Wind);
const ReflectionIcon = withKashIcon(BookText);
const StatsIcon = withKashIcon(BarChart3);
const TravelIcon = withKashIcon(Mountain);

/**
 * Copy + icon for tabs whose features ship in later slices. The Garden home is
 * built now, so it has no "coming soon" entry.
 */
export const CARE_COMING_SOON: Record<
  Exclude<CareTab, "garden">,
  { title: string; copy: string; Icon: LucideIcon }
> = {
  tasks: {
    title: "Self-care library",
    copy: "Browse and adopt self-care practices by theme, then check them off.",
    Icon: TasksIcon,
  },
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
  stats: {
    title: "Self-care stats",
    copy: "A quiet look at your self-care, wins, and mood over time.",
    Icon: StatsIcon,
  },
  travel: {
    title: "Restorative time",
    copy: "Plan restorative time — a rest day, a weekend, or a longer break.",
    Icon: TravelIcon,
  },
};
