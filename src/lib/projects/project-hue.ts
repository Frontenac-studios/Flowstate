import type { ProjectCategory } from "./categories";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "./category-tokens";

/**
 * Spec v2 — colour follows the project. Every business project carries one of the
 * eight project hues (--project-1..8 in tokens.css), assigned in order at creation
 * and overridable. Personal projects are always personal purple (hue is null).
 */
export const PROJECT_HUES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type ProjectHue = (typeof PROJECT_HUES)[number];

export function isProjectHue(value: unknown): value is ProjectHue {
  return typeof value === "number" && (PROJECT_HUES as readonly number[]).includes(value);
}

/**
 * The hue a new business project gets: the least-used hue among the user's live
 * business projects, lowest number first — so hues go out in order and never
 * repeat until all eight are taken.
 */
export function pickNextHue(existing: ReadonlyArray<number | null>): ProjectHue {
  const counts = new Map<ProjectHue, number>(PROJECT_HUES.map((h) => [h, 0]));
  for (const hue of existing) {
    if (isProjectHue(hue)) counts.set(hue, counts.get(hue)! + 1);
  }
  let best: ProjectHue = 1;
  for (const hue of PROJECT_HUES) {
    if (counts.get(hue)! < counts.get(best)!) best = hue;
  }
  return best;
}

type HueSource = { category: ProjectCategory; hue?: number | null };

function hueStop(source: HueSource, stop: "solid" | "fill" | "text"): string {
  if (source.category === "business" && isProjectHue(source.hue)) {
    return `var(--project-${source.hue}-${stop})`;
  }
  // Personal (always purple) and any business row still without a hue fall back
  // to the category colour — personal's category purple IS --project-personal.
  if (stop === "solid") return categorySolidVar(source.category);
  if (stop === "fill") return categoryFillVar(source.category);
  return categoryTextVar(source.category);
}

/** The project's stripe / dot colour. */
export function projectSolidVar(source: HueSource): string {
  return hueStop(source, "solid");
}

/** The project's soft tint (selected rows, chips). */
export function projectFillVar(source: HueSource): string {
  return hueStop(source, "fill");
}

/** Readable ink on the project's tint. */
export function projectTextVar(source: HueSource): string {
  return hueStop(source, "text");
}

/**
 * A task's stripe colour: its project's hue when it has one, otherwise its
 * category colour (loose tasks and personal projects).
 */
export function taskSolidVar(task: {
  category: ProjectCategory;
  projectHue?: number | null;
}): string {
  return projectSolidVar({ category: task.category, hue: task.projectHue });
}

/**
 * Inline style for a `.kash-tint-scope` element: hover, pressed and focus inside it
 * take the project's colour (Spec v3 Ib/Fc) instead of the default gray.
 */
export function tintScopeStyle(source: HueSource): { "--tint": string } {
  return { "--tint": projectSolidVar(source) };
}
