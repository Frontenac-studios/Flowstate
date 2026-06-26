import { PROJECT_CATEGORY_META, type ProjectCategory } from "./categories";

/**
 * Maps each category enum value to its design-token suffix (DT-3, tokens.css).
 * The enum keys and token names diverge (`personal_projects` → `personal`,
 * `body_mind` → `body-mind`), so this is the single source for that mapping.
 */
const CATEGORY_TOKEN_SUFFIX: Record<ProjectCategory, string> = {
  professional: "professional",
  personal_projects: "personal",
  relationships: "relationships",
  body_mind: "body-mind",
  adulting: "adulting",
};

/** The `--cat-{suffix}-solid` CSS variable reference for a category's accent. */
export function categorySolidVar(category: ProjectCategory): string {
  return `var(--cat-${CATEGORY_TOKEN_SUFFIX[category]}-solid)`;
}

/** The `--cat-{suffix}-fill` CSS variable — the soft tint behind a category chip. */
export function categoryFillVar(category: ProjectCategory): string {
  return `var(--cat-${CATEGORY_TOKEN_SUFFIX[category]}-fill)`;
}

/** The `--cat-{suffix}-text` CSS variable — readable ink on the soft fill. */
export function categoryTextVar(category: ProjectCategory): string {
  return `var(--cat-${CATEGORY_TOKEN_SUFFIX[category]}-text)`;
}

/** Seed display label (pre-override fallback). */
export function categorySeedLabel(category: ProjectCategory): string {
  return PROJECT_CATEGORY_META[category].label;
}
