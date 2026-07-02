import type { CareKind, CareTheme } from "@/lib/care/types";

import type { HeroWinSlot } from "./types";
import { HERO_WIN_SLOTS } from "./types";

/** Internal facet keys — UI copy uses Body · Mind · Soul (DW-7). */
export const WIN_FACETS = ["physical", "mental", "spiritual"] as const;
export type WinFacet = (typeof WIN_FACETS)[number];

export const SLOT_FACET: Record<HeroWinSlot, WinFacet> = {
  0: "physical",
  1: "mental",
  2: "spiritual",
};

export function facetLabel(facet: WinFacet): string {
  return { physical: "Body", mental: "Mind", spiritual: "Soul" }[facet];
}

export function facetInvitation(facet: WinFacet): string {
  const copy: Record<WinFacet, string> = {
    physical: "Body is open — a walk or stretch counts",
    mental: "Mind is open — reading or creating counts",
    spiritual: "Soul is open — evening reflection counts",
  };
  return copy[facet];
}

export function facetCssVars(facet: WinFacet): {
  fill: string;
  solid: string;
  text: string;
} {
  const prefix = { physical: "body", mental: "mind", spiritual: "soul" }[facet];
  return {
    fill: `var(--win-${prefix}-fill)`,
    solid: `var(--win-${prefix}-solid)`,
    text: `var(--win-${prefix}-text)`,
  };
}

const BODY_KEYWORDS =
  /\b(walk|stretch|workout|run|yoga|sleep|rest|water|meal|fresh air|outside|body|move)\b/i;
const MIND_KEYWORDS =
  /\b(read|write|learn|create|build|ship|code|design|focus|plan|think|study|work)\b/i;
const SOUL_KEYWORDS =
  /\b(breath|reflect|gratitude|journal|meditat|pray|kind|connect|friend|calm|feel)\b/i;

/** Infer facet from win source + label (Phase 1 title heuristic). */
export function inferWinFacet(input: {
  source: string;
  label: string;
  slot?: number | null;
}): WinFacet {
  if (input.slot !== null && input.slot !== undefined && input.slot in SLOT_FACET) {
    return SLOT_FACET[input.slot as HeroWinSlot];
  }

  const label = input.label.trim();
  if (input.source === "care_event") {
    if (SOUL_KEYWORDS.test(label) || /breath|reflect/i.test(label)) return "spiritual";
    if (BODY_KEYWORDS.test(label)) return "physical";
    return "spiritual";
  }
  if (input.source === "goal") return "mental";
  if (SOUL_KEYWORDS.test(label)) return "spiritual";
  if (BODY_KEYWORDS.test(label)) return "physical";
  if (MIND_KEYWORDS.test(label)) return "mental";
  return "mental";
}

/** Map care practice theme/kind to a win facet for stats split (C4). */
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

export function openFacetsFromSlots(slots: ReadonlyArray<unknown | null>): WinFacet[] {
  return HERO_WIN_SLOTS.filter((slot) => !slots[slot]).map((slot) => SLOT_FACET[slot]);
}
