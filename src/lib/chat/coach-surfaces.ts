import type { CoachDockSurface } from "@/lib/chat/threads";

/** Copy for a page's pinned coach dock: header, composer prompt, and empty state. */
export type CoachSurfaceConfig = {
  title: string;
  subtitle: string;
  placeholder: string;
  emptyTitle: string;
  emptyBody: string;
};

/**
 * Per-surface copy for the permanently-pinned coach docks. Each register + tool set
 * is defined server-side keyed by the same surface; this only carries the dock's
 * human-facing framing so every page reads in its own voice (Plan keeps its own copy).
 */
export const COACH_SURFACE_CONFIG: Record<CoachDockSurface, CoachSurfaceConfig> = {
  today: {
    title: "Today's coach",
    subtitle: "Shape today into something doable.",
    placeholder: "Tell the coach about today…",
    emptyTitle: "What's today about?",
    emptyBody:
      "Tell me what's on your plate and what matters most — I'll help you shape a day that actually fits.",
  },
  week: {
    title: "Week coach",
    subtitle: "Line up the week ahead.",
    placeholder: "Tell the coach about your week…",
    emptyTitle: "Planning the week?",
    emptyBody:
      "Tell me what this week needs to hold — deadlines, rhythms, a lighter Friday — and I'll help you lay it out.",
  },
  projects: {
    title: "Projects coach",
    subtitle: "Move your projects forward.",
    placeholder: "Tell the coach about a project…",
    emptyTitle: "Where are your projects at?",
    emptyBody:
      "Tell me what you're trying to push forward and where it's stuck — I'll help you find the next move.",
  },
  "loose-tasks": {
    title: "Tasks coach",
    subtitle: "Wrangle the loose ends.",
    placeholder: "Tell the coach about these tasks…",
    emptyTitle: "A pile of loose tasks?",
    emptyBody: "Tell me what's here and I'll help you group it, prioritize it, or clear it out.",
  },
  backlog: {
    title: "Backlog coach",
    subtitle: "Sift what's worth keeping.",
    placeholder: "Tell the coach about the backlog…",
    emptyTitle: "Digging through the backlog?",
    emptyBody:
      "Tell me what you're looking for or what's weighing on you — I'll help you resurface it or let it go.",
  },
  reviews: {
    title: "Review coach",
    subtitle: "Reflect on the week behind you.",
    placeholder: "Reflect with the coach…",
    emptyTitle: "Looking back on the week?",
    emptyBody:
      "Tell me how it went — what landed, what slipped — and I'll help you carry the right things forward.",
  },
  care: {
    title: "Care coach",
    subtitle: "Check in with yourself.",
    placeholder: "Tell the coach how you're doing…",
    emptyTitle: "How are you, really?",
    emptyBody:
      "Tell me how you're feeling and what you need — no tasks, just a moment to check in.",
  },
};
