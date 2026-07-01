import {
  addDays,
  startOfIsoWeekMonday,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

export type YearActivityCompletedTask = {
  completedAt: Date;
  category: ProjectCategory;
};

export type YearActivityTimeEntry = {
  startedAt: Date;
  endedAt: Date | null;
  category: ProjectCategory;
};

export type YearActivityInput = {
  year: number;
  completedTasks: YearActivityCompletedTask[];
  timeEntries: YearActivityTimeEntry[];
  now?: Date;
};

export type YearHeatWeek = {
  weekStart: string;
  dominantCategory: ProjectCategory | null;
};

export type YearHeatQuarter = {
  quarter: 1 | 2 | 3 | 4;
  categoryWeights: Record<ProjectCategory, number>;
  weeks: YearHeatWeek[];
};

export type YearHeatResult = {
  quarters: YearHeatQuarter[];
  /** Year-level categories below the neglect floor share. */
  neglectedCategories: ProjectCategory[];
};

const NEGLECT_FLOOR_SHARE = 0.05;
const QUARTERS = [1, 2, 3, 4] as const;

type WeekCategoryMap = Map<string, Map<ProjectCategory, number>>;

function emptyCategoryWeights(): Record<ProjectCategory, number> {
  return Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c, 0])) as Record<
    ProjectCategory,
    number
  >;
}

function addToWeekMap(
  map: WeekCategoryMap,
  weekStart: string,
  category: ProjectCategory,
  amount: number
) {
  let week = map.get(weekStart);
  if (!week) {
    week = new Map();
    map.set(weekStart, week);
  }
  week.set(category, (week.get(category) ?? 0) + amount);
}

function weekKeyForDate(date: Date): string {
  return toISODateString(startOfIsoWeekMonday(date));
}

/** Calendar quarter bounds in local time. */
export function quarterDateRange(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = startOfLocalDay(new Date(year, startMonth, 1));
  const end = startOfLocalDay(new Date(year, startMonth + 3, 0));
  return { start, end };
}

/** ISO Monday-start weeks overlapping a calendar quarter. */
export function weeksInQuarter(year: number, quarter: 1 | 2 | 3 | 4): string[] {
  const { start, end } = quarterDateRange(year, quarter);
  const weeks: string[] = [];
  let monday = startOfIsoWeekMonday(start);
  const quarterStartMs = start.getTime();
  const quarterEndMs = end.getTime();

  while (monday.getTime() <= quarterEndMs + 6 * 86_400_000) {
    const weekEnd = addDays(monday, 6);
    if (weekEnd.getTime() >= quarterStartMs && monday.getTime() <= quarterEndMs) {
      weeks.push(toISODateString(monday));
    }
    monday = addDays(monday, 7);
    if (monday.getFullYear() > year + 1) break;
  }

  return weeks;
}

function pickDominant(weights: Record<ProjectCategory, number>): ProjectCategory | null {
  let best: ProjectCategory | null = null;
  let bestWeight = 0;
  for (const category of PROJECT_CATEGORIES) {
    const weight = weights[category];
    if (weight > bestWeight) {
      bestWeight = weight;
      best = category;
    }
  }
  return bestWeight > 0 ? best : null;
}

function weekWeightsFromMaps(
  weekStart: string,
  timeByWeek: WeekCategoryMap,
  completionsByWeek: WeekCategoryMap
): Record<ProjectCategory, number> {
  const weights = emptyCategoryWeights();
  const timeRow = timeByWeek.get(weekStart);
  const completionRow = completionsByWeek.get(weekStart);

  let timeTotal = 0;
  if (timeRow) {
    for (const category of PROJECT_CATEGORIES) {
      const seconds = timeRow.get(category) ?? 0;
      if (seconds > 0) {
        weights[category] += seconds;
        timeTotal += seconds;
      }
    }
  }

  if (timeTotal > 0) return weights;

  if (completionRow) {
    for (const category of PROJECT_CATEGORIES) {
      const count = completionRow.get(category) ?? 0;
      if (count > 0) weights[category] += count;
    }
  }

  return weights;
}

function mergeIntoTotals(
  totals: Record<ProjectCategory, number>,
  weights: Record<ProjectCategory, number>
) {
  for (const category of PROJECT_CATEGORIES) {
    totals[category] += weights[category];
  }
}

export function detectNeglectedCategories(
  totals: Record<ProjectCategory, number>
): ProjectCategory[] {
  const total = PROJECT_CATEGORIES.reduce((sum, category) => sum + totals[category], 0);
  if (total === 0) return [];
  return PROJECT_CATEGORIES.filter((category) => totals[category] / total < NEGLECT_FLOOR_SHARE);
}

/**
 * Actual-only year heat: proportional quarter bars + dominant-color week dots (PM2-1/2).
 * Prefers focus-time seconds per week; falls back to completed-task counts when no time data.
 */
export function aggregateYearActivity(input: YearActivityInput): YearHeatResult {
  const now = input.now ?? new Date();
  const timeByWeek: WeekCategoryMap = new Map();
  const completionsByWeek: WeekCategoryMap = new Map();

  for (const entry of input.timeEntries) {
    const end = entry.endedAt ?? now;
    const seconds = Math.max(0, Math.floor((end.getTime() - entry.startedAt.getTime()) / 1000));
    if (seconds <= 0) continue;
    addToWeekMap(timeByWeek, weekKeyForDate(entry.startedAt), entry.category, seconds);
  }

  for (const task of input.completedTasks) {
    addToWeekMap(completionsByWeek, weekKeyForDate(task.completedAt), task.category, 1);
  }

  const yearTotals = emptyCategoryWeights();
  const quarters: YearHeatQuarter[] = QUARTERS.map((quarter) => {
    const quarterTotals = emptyCategoryWeights();
    const weeks = weeksInQuarter(input.year, quarter).map((weekStart) => {
      const weights = weekWeightsFromMaps(weekStart, timeByWeek, completionsByWeek);
      mergeIntoTotals(quarterTotals, weights);
      return {
        weekStart,
        dominantCategory: pickDominant(weights),
      };
    });

    mergeIntoTotals(yearTotals, quarterTotals);

    return {
      quarter,
      categoryWeights: quarterTotals,
      weeks,
    };
  });

  return {
    quarters,
    neglectedCategories: detectNeglectedCategories(yearTotals),
  };
}

/** Neglected categories for a single quarter scope (PM2-4 drill-in strips). */
export function detectQuarterNeglected(
  weights: Record<ProjectCategory, number>
): ProjectCategory[] {
  return detectNeglectedCategories(weights);
}
