import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

/** Trailing weeks used to learn each category's typical rhythm. */
export const BASELINE_WINDOW_WEEKS = 4;

/** Suppress balance nudges until this many weeks of history exist. */
export const COLD_START_SUPPRESSION_WEEKS = 3;

/** Current week below this fraction of its learned baseline counts as starved. */
export const BELOW_USUAL_RATIO = 0.6;

/** One category holding at least this share of attention reads as dominant. */
export const DOMINANT_SHARE = 0.4;

export type CategoryAttention = Record<ProjectCategory, number>;

export type CategoryBaselineEvaluation = {
  ready: boolean;
  lopsided: boolean;
  dominant: ProjectCategory | null;
  starvedCategories: ProjectCategory[];
  mostStarved: ProjectCategory | null;
};

export function emptyCategoryAttention(): CategoryAttention {
  return {
    professional: 0,
    personal_projects: 0,
    relationships: 0,
    body_mind: 0,
    adulting: 0,
  };
}

export function sumCategoryAttention(attention: CategoryAttention): number {
  return PROJECT_CATEGORIES.reduce((sum, category) => sum + attention[category], 0);
}

function dominantCategory(attention: CategoryAttention): ProjectCategory | null {
  const total = sumCategoryAttention(attention);
  if (total <= 0) return null;
  for (const category of PROJECT_CATEGORIES) {
    if (attention[category] / total >= DOMINANT_SHARE) return category;
  }
  return null;
}

function averageBaseline(weeks: CategoryAttention[]): CategoryAttention {
  const result = emptyCategoryAttention();
  if (weeks.length === 0) return result;
  for (const category of PROJECT_CATEGORIES) {
    const sum = weeks.reduce((acc, week) => acc + week[category], 0);
    result[category] = sum / weeks.length;
  }
  return result;
}

function categoriesBelowUsual(
  current: CategoryAttention,
  baseline: CategoryAttention
): ProjectCategory[] {
  const starved: ProjectCategory[] = [];
  for (const category of PROJECT_CATEGORIES) {
    const usual = baseline[category];
    if (usual <= 0) continue;
    if (current[category] < usual * BELOW_USUAL_RATIO) {
      starved.push(category);
    }
  }
  return starved.sort((a, b) => {
    const ratioA = current[a] / Math.max(baseline[a], 1);
    const ratioB = current[b] / Math.max(baseline[b], 1);
    if (ratioA !== ratioB) return ratioA - ratioB;
    return baseline[b] - current[b] - (baseline[a] - current[a]);
  });
}

/**
 * Compare the current week's category attention against a trailing learned baseline.
 * Gates on overall lopsidedness (dominant >= 40%) before flagging starved categories.
 */
export function evaluateCategoryBaseline(input: {
  historicalWeeks: readonly CategoryAttention[];
  currentWeek: CategoryAttention;
}): CategoryBaselineEvaluation {
  const ready = input.historicalWeeks.length >= COLD_START_SUPPRESSION_WEEKS;
  const dominant = dominantCategory(input.currentWeek);
  const lopsided = dominant !== null;

  if (!ready || !lopsided) {
    return {
      ready,
      lopsided,
      dominant,
      starvedCategories: [],
      mostStarved: null,
    };
  }

  const trailing = input.historicalWeeks.slice(-BASELINE_WINDOW_WEEKS);
  const baseline = averageBaseline(trailing);
  const starvedCategories = categoriesBelowUsual(input.currentWeek, baseline);

  return {
    ready,
    lopsided,
    dominant,
    starvedCategories,
    mostStarved: starvedCategories[0] ?? null,
  };
}
