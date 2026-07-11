import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

/**
 * J3 — learn from accept/reject. Pure logic for deriving a coaching signal from the
 * outcomes of past `propose_bingo_goals` proposals on a card-year's coaching thread.
 *
 * The signal is intentionally category-level and observation-only: it feeds the coach's
 * context so it can *surface and ask* ("you've passed on the last few Body & Mind ideas —
 * want me to ease off?"), never so it can silently re-weight suggestions. Adaptation only
 * happens after the user consents (see goal-coach-adaptations.ts).
 */

/** One past proposal's outcome, reduced to what the signal needs. */
export type GoalProposalOutcome = {
  status: "pending" | "applied" | "dismissed";
  /** Distinct categories present on the proposal's items (untagged items omitted). */
  categories: readonly ProjectCategory[];
};

export type CategorySignalEntry = { accepted: number; dismissed: number };
export type CategorySignal = Record<ProjectCategory, CategorySignalEntry>;

/**
 * How many times the user must pass on a category (with zero accepts) before the coach
 * may raise it. Deliberately conservative — one skip is noise, a run of them is a signal.
 */
export const EASE_OFF_DISMISS_THRESHOLD = 3;

function emptySignal(): CategorySignal {
  return Object.fromEntries(
    PROJECT_CATEGORIES.map((c) => [c, { accepted: 0, dismissed: 0 }])
  ) as CategorySignal;
}

/**
 * Tally accepted (applied) vs passed-on (dismissed) proposals per category. A proposal
 * counts once per distinct category it contained; pending proposals are ignored (no
 * decision yet).
 */
export function deriveCategorySignal(outcomes: readonly GoalProposalOutcome[]): CategorySignal {
  const signal = emptySignal();
  for (const outcome of outcomes) {
    if (outcome.status === "pending") continue;
    const seen = new Set<ProjectCategory>();
    for (const category of outcome.categories) {
      if (seen.has(category)) continue;
      seen.add(category);
      if (outcome.status === "applied") signal[category].accepted += 1;
      else signal[category].dismissed += 1;
    }
  }
  return signal;
}

/**
 * Categories where a skip pattern has emerged worth surfacing: dismissed at or above the
 * threshold, never accepted, and not already eased. Ordered by canonical category order
 * for stable prompts.
 */
export function detectEaseOffCandidates(
  signal: CategorySignal,
  alreadyEased: readonly ProjectCategory[]
): ProjectCategory[] {
  const eased = new Set(alreadyEased);
  return PROJECT_CATEGORIES.filter((category) => {
    if (eased.has(category)) return false;
    const entry = signal[category];
    return entry.accepted === 0 && entry.dismissed >= EASE_OFF_DISMISS_THRESHOLD;
  });
}

/**
 * Apply a consented adjustment to the eased-category set: add `easeOff`, drop `resume`,
 * de-duplicate, and return in canonical category order. Resume wins over easeOff when a
 * category appears in both (an explicit "resume" shouldn't be silently re-suppressed).
 */
export function mergeEased(
  current: readonly ProjectCategory[],
  easeOff: readonly ProjectCategory[] = [],
  resume: readonly ProjectCategory[] = []
): ProjectCategory[] {
  const resumeSet = new Set(resume);
  const next = new Set(current.filter((c) => !resumeSet.has(c)));
  for (const category of easeOff) {
    if (!resumeSet.has(category)) next.add(category);
  }
  return PROJECT_CATEGORIES.filter((category) => next.has(category));
}
