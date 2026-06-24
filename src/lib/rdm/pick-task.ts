export type RdmPickTask = {
  id: string;
  title: string;
  isTop3: boolean;
  completedAt: Date | null;
  /** Blocked by an incomplete dependency — RDM hard-skips it (3.c). */
  isBlocked?: boolean;
  /** Incomplete tasks this one directly unblocks — nudges its weight up (3.d). */
  unblocksCount?: number;
};

export type PickRdmResult = {
  id: string;
  title: string;
  isTop3: boolean;
};

/** Each incomplete task a blocker unblocks adds this to its weight multiplier (3.d). */
const WEIGHT_PER_UNBLOCK = 0.5;
/** Cap the bonus at the blocker soft cap so priority stays legible. */
const MAX_UNBLOCK_BONUS = 8;

/**
 * RDM pick weight: the Top-3 interleave bias, scaled up for blockers that unblock
 * other incomplete tasks (3.d). Pure + exported for unit testing.
 */
export function rdmWeight(
  task: { isTop3: boolean; unblocksCount?: number },
  lastWasLarge: boolean
): number {
  const isLarge = task.isTop3;
  const base = lastWasLarge ? (isLarge ? 1 : 3) : isLarge ? 3 : 1;
  const dependents = Math.min(MAX_UNBLOCK_BONUS, task.unblocksCount ?? 0);
  return base * (1 + WEIGHT_PER_UNBLOCK * dependents);
}

function weightedRandomPick<T>(items: T[], weights: number[]): T | null {
  if (items.length === 0) return null;
  if (items.length !== weights.length) return items[0] ?? null;

  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return items[0] ?? null;

  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }

  return items[items.length - 1] ?? null;
}

/**
 * Weighted RDM pick:
 * - Default: Top-3 tasks are 3x more likely than non-Top-3.
 * - If `lastWasLarge` is true: swap weights so non-Top-3 tasks are 3x more likely.
 */
export function pickRdmTask(
  tasks: RdmPickTask[],
  options?: {
    lastWasLarge?: boolean;
  }
): PickRdmResult | null {
  // Hard-skip blocked tasks: RDM never auto-picks something the user can't start (3.c).
  const eligible = tasks.filter((t) => t.completedAt === null && !t.isBlocked);
  if (eligible.length === 0) return null;

  const lastWasLarge = options?.lastWasLarge ?? false;

  const weights = eligible.map((t) => rdmWeight(t, lastWasLarge));

  const pick = weightedRandomPick(eligible, weights);

  if (!pick) return null;
  return { id: pick.id, title: pick.title, isTop3: pick.isTop3 };
}
