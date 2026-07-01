import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

import { detectNeglectedCategories } from "./year-heat";

export type BalanceTier = "floor" | "target_gap";

export type BalanceHorizon = "week" | "month";

export type BalancePassScope = {
  horizon: BalanceHorizon;
  year: number;
  month?: number;
  quarter?: number;
  weekStart?: string;
  tzOffsetMinutes: number;
};

export type BalanceFlag = {
  category: ProjectCategory;
  tier: BalanceTier;
  /** Lower rank = louder. Floor + stated focus = 0. */
  rank: number;
  hasStatedFocus: boolean;
};

/** Stable key for filtering persisted balance-pass suggestions by planning scope. */
export function balancePassScopeKey(
  scope: Pick<BalancePassScope, "horizon" | "year" | "month" | "weekStart">
): string {
  if (scope.horizon === "week" && scope.weekStart) {
    return `week:${scope.weekStart}`;
  }
  if (scope.month != null) {
    return `month:${scope.year}-${scope.month}`;
  }
  return `${scope.horizon}:${scope.year}`;
}

export function emptyCategoryWeights(): Record<ProjectCategory, number> {
  return Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c, 0])) as Record<
    ProjectCategory,
    number
  >;
}

/**
 * Two-tier balance flags (PM6-3): near-zero floor categories first, then below-intention target gaps.
 * "Empty + stated focus" (floor tier with intention) ranks loudest.
 */
export function computeBalanceFlags(
  categoryWeights: Record<ProjectCategory, number>,
  statedCategories: ReadonlySet<ProjectCategory>
): BalanceFlag[] {
  const total = PROJECT_CATEGORIES.reduce((sum, category) => sum + categoryWeights[category], 0);
  const floorCategories = detectNeglectedCategories(categoryWeights);
  const flags: BalanceFlag[] = [];
  const seen = new Set<ProjectCategory>();

  for (const category of floorCategories) {
    const hasStatedFocus = statedCategories.has(category);
    flags.push({
      category,
      tier: "floor",
      hasStatedFocus,
      rank: hasStatedFocus ? 0 : 1,
    });
    seen.add(category);
  }

  if (statedCategories.size > 0 && total > 0) {
    const targetShare = 1 / statedCategories.size;
    for (const category of Array.from(statedCategories)) {
      if (seen.has(category)) continue;
      const share = categoryWeights[category] / total;
      if (share < targetShare * 0.5) {
        flags.push({
          category,
          tier: "target_gap",
          hasStatedFocus: true,
          rank: 2,
        });
        seen.add(category);
      }
    }
  }

  return flags.sort((a, b) => a.rank - b.rank || a.category.localeCompare(b.category));
}

export function balanceSuggestionLabel(
  category: ProjectCategory,
  categoryLabel: string,
  tier: BalanceTier
): string {
  if (tier === "floor") {
    return `${categoryLabel} has had almost no attention lately`;
  }
  return `${categoryLabel} is below your stated intention`;
}

export type CategoryActivityRow = { category: ProjectCategory };

/** Count activity rows per category for balance detection. */
export function weightsFromActivity(
  rows: readonly CategoryActivityRow[]
): Record<ProjectCategory, number> {
  const weights = emptyCategoryWeights();
  for (const row of rows) {
    weights[row.category] += 1;
  }
  return weights;
}
