import type { ReactNode } from "react";

import type { SwitcherOption } from "../InPageSwitcher";

/**
 * Care sub-sections (§12 "Care — RESOLVED"). The Garden is the garden-centric
 * home; the rest are top tabs. Icons are hand-authored inline SVG (the repo has
 * no icon dependency) matching the nav-rail stroke style, used only by the
 * "coming soon" landings — the top tabs themselves are text-only pills.
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

const iconProps = {
  viewBox: "0 0 24 24",
  width: 26,
  height: 26,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TasksIcon: ReactNode = (
  <svg {...iconProps}>
    <path d="M4 6h2M4 12h2M4 18h2" />
    <path d="M9.5 6h10.5M9.5 12h10.5M9.5 18h10.5" />
  </svg>
);

const BreathingIcon: ReactNode = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const ReflectionIcon: ReactNode = (
  <svg {...iconProps}>
    <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M9 8h5M9 12h5" />
  </svg>
);

const StatsIcon: ReactNode = (
  <svg {...iconProps}>
    <path d="M5 20V10M12 20V5M19 20v-7" />
  </svg>
);

const TravelIcon: ReactNode = (
  <svg {...iconProps}>
    <path d="M3 20h18" />
    <path d="M12 4 5 20M12 4l7 16" />
    <path d="M12 4v16" />
  </svg>
);

/**
 * Copy + icon for tabs whose features ship in later slices. The Garden home is
 * built now, so it has no "coming soon" entry.
 */
export const CARE_COMING_SOON: Record<
  Exclude<CareTab, "garden">,
  { title: string; copy: string; icon: ReactNode }
> = {
  tasks: {
    title: "Self-care library",
    copy: "Browse and adopt self-care practices by theme, then check them off.",
    icon: TasksIcon,
  },
  breathing: {
    title: "Breathing",
    copy: "Guided breathing with a pulsing orb — box breathing and more.",
    icon: BreathingIcon,
  },
  reflection: {
    title: "Reflection",
    copy: "A gentle nightly prompt, space to write, and your reflections archive.",
    icon: ReflectionIcon,
  },
  stats: {
    title: "Self-care stats",
    copy: "A quiet look at your self-care, wins, and mood over time.",
    icon: StatsIcon,
  },
  travel: {
    title: "Restorative time",
    copy: "Plan restorative time — a rest day, a weekend, or a longer break.",
    icon: TravelIcon,
  },
};
