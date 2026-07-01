import type { ProjectCategory } from "@/lib/projects/categories";

/** Map reserved-day type to protected-block category (PM-4 self-care). */
export function protectedBlockCategoryForReservedDay(
  type: "outside" | "personal"
): ProjectCategory {
  return type === "outside" ? "body_mind" : "personal_projects";
}

export function defaultReservedDayLabel(type: "outside" | "personal"): string {
  return type === "outside" ? "Outside day" : "Personal day";
}
