export const PROJECT_CATEGORIES = ["business", "personal"] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_CATEGORY_META: Record<ProjectCategory, { label: string; color: string }> = {
  business: { label: "Business", color: "#009ddc" },
  personal: { label: "Personal", color: "#973d97" },
};

export function categoryLabel(category: ProjectCategory): string {
  return PROJECT_CATEGORY_META[category].label;
}
