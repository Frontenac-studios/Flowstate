export const PLANNING_HORIZONS = ["week", "month", "quarter", "year", "bingo"] as const;

export type PlanningHorizon = (typeof PLANNING_HORIZONS)[number];

export type PlanningBreadcrumb = {
  year: number;
  quarter?: number;
  month?: number;
  isoWeek?: number;
};

export const PLANNING_HORIZON_STORAGE_KEY = "kash.plan.horizon";
export const PLANNING_BREADCRUMB_STORAGE_KEY = "kash.plan.breadcrumb";

export const HORIZON_OPTIONS = [
  { value: "week" as const, label: "Week" },
  { value: "month" as const, label: "Month" },
  { value: "quarter" as const, label: "Quarter" },
  { value: "year" as const, label: "Year" },
  { value: "bingo" as const, label: "Bingo" },
];

export const HORIZON_PLACEHOLDER_COPY: Record<PlanningHorizon, string> = {
  week: "Select a month in the breadcrumb to zoom into a week.",
  month: "Nothing planned yet for this month.",
  quarter: "Nothing planned yet for this quarter.",
  year: "Nothing planned yet for this year.",
  bingo: "Your annual bingo card will live here.",
};
