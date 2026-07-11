/**
 * Server-side backstop that keeps AI-suggested bingo goals shaped like bingo goals:
 * a single, whole, binary thing you can check off by year's end. The Goals-coach prompt
 * is the primary guard; these rules catch the obvious slips (recurring habits, vague
 * aspirations, essays). Patterns are exported so they stay easy to tune (see Risk #5 in
 * the design plan — favour false negatives over false positives; the model is the main
 * guard, this is the net).
 */

export const GOAL_TITLE_MAX_CHARS = 80;

export type GoalRejectionReason = "empty" | "too_long" | "recurring" | "not_binary";

export type GoalGuardrailResult =
  | { ok: true; title: string }
  | { ok: false; reason: GoalRejectionReason };

/** Tells of a task/habit masquerading as a goal — a bingo square is done once, not on a cadence. */
export const RECURRING_PATTERNS: readonly RegExp[] = [
  /\bevery\b/i,
  /\bdaily\b/i,
  /\bweekly\b/i,
  /\bmonthly\b/i,
  /\beach (day|morning|night|evening|week|month)\b/i,
  /\b\d+\s*(x|times)\s*(a|per)\s*(day|week|month)\b/i,
  /\broutine\b/i,
  /\bhabit\b/i,
  /\bregularly\b/i,
];

/** Tells of an open-ended aspiration with no clear finish line ("get fitter", "be present"). */
export const NON_BINARY_PATTERNS: readonly RegExp[] = [
  /\b(more|less)\s*$/i,
  /\bbe (more|less|better)\b/i,
  /\bget (fitter|healthier|stronger|better|leaner|richer|in shape)\b/i,
  /^(improve|work on|focus on|maintain|keep)\b/i,
  /^(be|feel|stay) [a-z]+$/i,
];

/** Normalize whitespace so length + pattern checks are stable. */
function normalizeTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Evaluate one suggested goal title against the guardrails. Returns the normalized title
 * on pass, or the first reason it was rejected.
 */
export function evaluateGoalSuggestion(rawTitle: string): GoalGuardrailResult {
  const title = normalizeTitle(rawTitle);
  if (title.length === 0) return { ok: false, reason: "empty" };
  if (title.length > GOAL_TITLE_MAX_CHARS) return { ok: false, reason: "too_long" };
  if (RECURRING_PATTERNS.some((re) => re.test(title))) return { ok: false, reason: "recurring" };
  if (NON_BINARY_PATTERNS.some((re) => re.test(title))) return { ok: false, reason: "not_binary" };
  return { ok: true, title };
}
