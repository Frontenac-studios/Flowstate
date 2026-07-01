import type { PlanningBreadcrumb, PlanningHorizon } from "./horizon-storage";

/** Deepest horizon implied by the breadcrumb path (NAV-3). */
export function horizonForBreadcrumb(breadcrumb: PlanningBreadcrumb): PlanningHorizon {
  if (breadcrumb.isoWeek != null) return "week";
  if (breadcrumb.month != null) return "month";
  if (breadcrumb.quarter != null) return "quarter";
  return "year";
}

export function zoomToYear(year: number): PlanningBreadcrumb {
  return { year };
}

export function zoomToQuarter(year: number, quarter: number): PlanningBreadcrumb {
  return { year, quarter };
}

export function zoomToMonth(year: number, quarter: number, month: number): PlanningBreadcrumb {
  return { year, quarter, month };
}

export function zoomToWeek(
  year: number,
  quarter: number,
  month: number,
  isoWeek: number
): PlanningBreadcrumb {
  return { year, quarter, month, isoWeek };
}

/** Keep scoped period fields up to the selected horizon depth (NAV-3). */
export function trimBreadcrumbForHorizon(
  breadcrumb: PlanningBreadcrumb,
  horizon: PlanningHorizon
): PlanningBreadcrumb {
  if (horizon === "bingo") return breadcrumb;
  if (horizon === "year") return { year: breadcrumb.year };
  if (horizon === "quarter") {
    return {
      year: breadcrumb.year,
      ...(breadcrumb.quarter != null ? { quarter: breadcrumb.quarter } : {}),
    };
  }
  if (horizon === "month") {
    return {
      year: breadcrumb.year,
      ...(breadcrumb.quarter != null ? { quarter: breadcrumb.quarter } : {}),
      ...(breadcrumb.month != null ? { month: breadcrumb.month } : {}),
    };
  }
  return breadcrumb;
}
