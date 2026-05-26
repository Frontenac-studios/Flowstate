export type RdmPickTask = {
  id: string;
  title: string;
  isTop3: boolean;
  completedAt: Date | null;
};

export type PickRdmResult = {
  id: string;
  title: string;
  isTop3: boolean;
};

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
  const eligible = tasks.filter((t) => t.completedAt === null);
  if (eligible.length === 0) return null;

  const lastWasLarge = options?.lastWasLarge ?? false;

  const weights = eligible.map((t) => {
    const isLarge = t.isTop3;
    // Prefer the opposite of what we last picked to interleave where possible.
    return lastWasLarge ? (isLarge ? 1 : 3) : isLarge ? 3 : 1;
  });

  const pick = weightedRandomPick(eligible, weights);

  if (!pick) return null;
  return { id: pick.id, title: pick.title, isTop3: pick.isTop3 };
}
