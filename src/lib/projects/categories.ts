export const PROJECT_CATEGORIES = [
  "professional",
  "personal_projects",
  "relationships",
  "body_mind",
  "adulting",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_CATEGORY_META: Record<ProjectCategory, { label: string; color: string }> = {
  professional: { label: "Professional", color: "#ffb900" },
  personal_projects: { label: "Personal Projects", color: "#f78200" },
  relationships: { label: "Relationships", color: "#973999" },
  body_mind: { label: "Body & Mind", color: "#5ebd3e" },
  adulting: { label: "Adulting", color: "#e23838" },
};

export function categoryLabel(category: ProjectCategory): string {
  return PROJECT_CATEGORY_META[category].label;
}

export function categoryColor(category: ProjectCategory): string {
  return PROJECT_CATEGORY_META[category].color;
}
