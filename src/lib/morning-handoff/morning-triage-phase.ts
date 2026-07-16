export type MorningTriagePhase =
  | "greeting"
  | "carryovers"
  | "projects"
  | "inbox"
  | "dump"
  | "ready";

export type MorningTriageCounts = {
  carryoverCount: number;
  inboxCount: number;
};

/** First phase after the greeting bubble, based on what's waiting. */
export function resolveInitialPhase(counts: MorningTriageCounts): MorningTriagePhase {
  if (counts.carryoverCount > 0) return "carryovers";
  return "projects";
}

/** Skip-to-dump jumps past carryovers, projects, and inbox. */
export function advanceAfterSkip(_phase: MorningTriagePhase): MorningTriagePhase {
  void _phase;
  return "dump";
}

export function nextPhaseAfterComplete(
  current: MorningTriagePhase,
  counts: MorningTriageCounts
): MorningTriagePhase {
  switch (current) {
    case "greeting":
      return resolveInitialPhase(counts);
    case "carryovers":
      return "projects";
    case "projects":
      return counts.inboxCount > 0 ? "inbox" : "dump";
    case "inbox":
      return "dump";
    case "dump":
      return "ready";
    case "ready":
      return "ready";
  }
}

/** Dump chat unlocks after acts 1–2 are done/skipped, or once inbox is reached. */
export function dumpUnlocked(phase: MorningTriagePhase, skippedToDump = false): boolean {
  if (skippedToDump) return true;
  return phase === "inbox" || phase === "dump" || phase === "ready";
}

export type CircleBackInput = {
  projectsSkipped: boolean;
  projectsResolved: boolean;
  hasRemainingSuggestions: boolean;
  phase: MorningTriagePhase;
};

/** Nudge back to project picks when the user skipped but suggestions remain. */
export function shouldCircleBackToProjects(input: CircleBackInput): boolean {
  if (!input.projectsSkipped || input.projectsResolved || !input.hasRemainingSuggestions) {
    return false;
  }
  return input.phase === "inbox" || input.phase === "dump";
}
