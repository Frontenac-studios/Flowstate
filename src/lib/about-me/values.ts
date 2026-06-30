import { z } from "zod";

import { VALUE_LABEL_MAX, VALUES_MAX } from "./constants";

export const valueLabelSchema = z
  .string()
  .trim()
  .min(1, "Add a word or two.")
  .max(VALUE_LABEL_MAX, `Keep it under ${VALUE_LABEL_MAX} characters.`);

/** Case- and whitespace-insensitive key, for dedupe within a user's set. */
export function normalizeValueLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True if `label` already exists in `existing` (ignoring case/whitespace). */
export function isDuplicateValue(label: string, existing: readonly string[]): boolean {
  const key = normalizeValueLabel(label);
  return existing.some((e) => normalizeValueLabel(e) === key);
}

/** Whether another value fits under the 3–7 max (the min is a soft floor, not enforced here). */
export function canAddValue(currentCount: number): boolean {
  return currentCount < VALUES_MAX;
}
