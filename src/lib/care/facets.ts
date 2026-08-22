import type { CareKind, CareTheme } from "@/lib/care/types";

/**
 * Facet vocabulary salvaged from the removed Daily Wins feature
 * (`src/lib/daily-wins/facets.ts`). Retained solely so the parked Care/garden
 * feature keeps compiling — only the symbols Care actually uses were copied.
 */

/** Internal facet keys — UI copy uses Body · Mind · Soul. */
export const WIN_FACETS = ["physical", "mental", "spiritual"] as const;
export type WinFacet = (typeof WIN_FACETS)[number];

/** Map care practice theme/kind to a facet for the Care stats split (C4). */
export function carePracticeFacet(input: {
  theme?: CareTheme | null;
  kind?: CareKind | null;
}): WinFacet {
  if (input.kind === "breathe" || input.kind === "reflect") return "spiritual";
  if (input.kind === "walk") return "physical";
  if (input.theme === "reflect" || input.theme === "connect" || input.theme === "calm") {
    return "spiritual";
  }
  if (input.theme === "move" || input.theme === "rest" || input.theme === "nourish") {
    return "physical";
  }
  return "mental";
}
