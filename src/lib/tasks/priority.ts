export const PRIORITY_LEVELS = [0, 1, 2, 3] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export type PriorityMeta = {
  level: PriorityLevel;
  /** Short label for compact controls (task-detail buttons). */
  label: string;
  /** Number of urgency dots (0 = none, reserved-empty zone). */
  dots: number;
  /** Tailwind bg-* for the dots: graphite ramp, crimson only at High (VF-4). */
  dotClass: string;
};

export const PRIORITY_META: Record<PriorityLevel, PriorityMeta> = {
  0: { level: 0, label: "None", dots: 0, dotClass: "" },
  1: { level: 1, label: "Low", dots: 1, dotClass: "bg-[var(--priority-low)]" },
  2: { level: 2, label: "Med", dots: 2, dotClass: "bg-[var(--priority-med)]" },
  3: { level: 3, label: "High", dots: 3, dotClass: "bg-[var(--priority-high)]" },
};

/** Clamp any stored priority integer to a known level (defaults to None). */
export function priorityMeta(priority: number): PriorityMeta {
  return PRIORITY_META[priority === 1 || priority === 2 || priority === 3 ? priority : 0];
}

/**
 * Word aliases for the `;` composer segment — one input language (VF-1).
 * `!`/`!!`/`!!!` survive only as a quiet alias inside `;` (handled by the parser).
 */
const PRIORITY_WORDS: Record<string, PriorityLevel> = {
  none: 0,
  low: 1,
  med: 2,
  medium: 2,
  high: 3,
};

/** Canonical priority words offered by the composer autocomplete. */
export const PRIORITY_WORD_SUGGESTIONS = ["low", "med", "high"] as const;

export function parsePriorityWord(token: string): PriorityLevel | null {
  const key = token.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PRIORITY_WORDS, key) ? PRIORITY_WORDS[key] : null;
}
