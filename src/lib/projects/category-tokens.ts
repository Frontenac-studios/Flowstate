import { PROJECT_CATEGORY_META, type ProjectCategory } from "./categories";

/**
 * Maps each category enum value to its design-token suffix (DT-3, tokens.css).
 * Since the enum collapsed to business|personal the suffix now matches the enum
 * value, but the indirection stays: it is the single seam if the two ever diverge
 * again, and every caller already goes through it.
 */
const CATEGORY_TOKEN_SUFFIX: Record<ProjectCategory, string> = {
  business: "business",
  personal: "personal",
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
