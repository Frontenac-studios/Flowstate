import { categorySeedLabel } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import type { AbyssBalanceCandidate } from "@/lib/planning/abyss-balance-candidates";
import { evaluateCategoryBaseline, type CategoryAttention } from "@/lib/tasks/category-baseline";

export type BalanceLopsidedEvaluation = {
  shouldFire: boolean;
  category: ProjectCategory | null;
  message: string;
  action: {
    type: "balance_add";
    payload: string;
  };
};

function templateBalanceMessage(
  category: ProjectCategory,
  candidate: AbyssBalanceCandidate | null
): string {
  const label = categorySeedLabel(category);
  if (candidate) {
    return `${label} has been light lately. ${candidate.title}?`;
  }
  return `${label} has been light lately — add a small thing?`;
}

export function evaluateBalanceLopsided(input: {
  historicalWeeks: readonly CategoryAttention[];
  currentWeek: CategoryAttention;
  candidate: AbyssBalanceCandidate | null;
  balanceNudgeEnabled: boolean;
  alreadyNudgedToday: boolean;
  isOverCommitted: boolean;
}): BalanceLopsidedEvaluation {
  const noop: BalanceLopsidedEvaluation = {
    shouldFire: false,
    category: null,
    message: "",
    action: { type: "balance_add", payload: "{}" },
  };

  if (!input.balanceNudgeEnabled || input.alreadyNudgedToday || input.isOverCommitted) {
    return noop;
  }

  const baseline = evaluateCategoryBaseline({
    historicalWeeks: input.historicalWeeks,
    currentWeek: input.currentWeek,
  });

  if (!baseline.ready || !baseline.mostStarved) return noop;

  const category = baseline.mostStarved;
  const payload = JSON.stringify({
    category,
    abyssItemId: input.candidate?.abyssItemId ?? null,
    title: input.candidate?.title ?? `Something for ${categorySeedLabel(category).toLowerCase()}`,
  });

  return {
    shouldFire: true,
    category,
    message: templateBalanceMessage(category, input.candidate),
    action: { type: "balance_add", payload },
  };
}
