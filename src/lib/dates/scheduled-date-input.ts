import {
  addDays,
  isDateInIsoWeek,
  parseISODateString,
  parseWeekdayToken,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";

const WEEKDAY_PATTERN = /^(sun|mon|tue|wed|thu|fri|sat)$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const SCHEDULED_DATE_KEYWORDS = ["today", "tomorrow", "later"] as const;
export const SCHEDULED_DATE_WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const SCHEDULED_DATE_INPUT_HELP = {
  summary: "Keywords, weekday abbreviations, or ISO date",
  keywords: [...SCHEDULED_DATE_KEYWORDS],
  weekdays: [...SCHEDULED_DATE_WEEKDAYS],
  isoExample: "2026-06-05",
} as const;

const SCHEDULED_DATE_SUGGESTION_CANDIDATES = [
  ...SCHEDULED_DATE_KEYWORDS,
  ...SCHEDULED_DATE_WEEKDAYS,
] as const;

export type ResolvedScheduledDate = {
  scheduledDate: string | null;
  bucketOverride: "later" | null;
};

/** True when `token` is a complete scheduled-date keyword or valid ISO date. */
export function isScheduledDateToken(token: string): boolean {
  return resolveScheduledDateToken(token, new Date()) !== null;
}

/** Parse and validate a YYYY-MM-DD token; returns null if invalid or non-calendar. */
export function parseISODateToken(token: string): string | null {
  const trimmed = token.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) return null;

  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }

  return toISODateString(date);
}

export function resolveScheduledDateToken(
  token: string,
  today: Date = new Date()
): ResolvedScheduledDate | null {
  const lower = token.trim().toLowerCase();

  if (lower === "later") {
    return { scheduledDate: null, bucketOverride: "later" };
  }

  if (lower === "today") {
    return { scheduledDate: toISODateString(startOfLocalDay(today)), bucketOverride: null };
  }

  if (lower === "tomorrow") {
    return {
      scheduledDate: toISODateString(addDays(startOfLocalDay(today), 1)),
      bucketOverride: null,
    };
  }

  if (WEEKDAY_PATTERN.test(lower)) {
    const day = parseWeekdayToken(lower, today);
    if (!day) return null;
    return { scheduledDate: toISODateString(day), bucketOverride: null };
  }

  const iso = parseISODateToken(token);
  if (iso) {
    return { scheduledDate: iso, bucketOverride: null };
  }

  return null;
}

/** Best matching token for tab completion; null when no reasonable prefix match. */
export function suggestScheduledDateToken(partial: string): string | null {
  const trimmed = partial.trim();
  if (!trimmed) return "today";

  const lower = trimmed.toLowerCase();
  const matches = SCHEDULED_DATE_SUGGESTION_CANDIDATES.filter((candidate) =>
    candidate.startsWith(lower)
  );

  return matches[0] ?? null;
}

/** Chip / preview label for a resolved scheduled date. */
export function formatScheduledDateLabel(
  iso: string | null,
  options: { bucketOverride?: "later" | null; ref?: Date } = {}
): string | null {
  if (options.bucketOverride === "later") return "Later";
  if (!iso) return null;

  const ref = options.ref ?? new Date();
  const todayIso = toISODateString(startOfLocalDay(ref));
  if (iso === todayIso) return "Today";

  if (isDateInIsoWeek(iso, ref)) {
    const weekday = parseISODateString(iso).getDay();
    return WEEKDAY_LABELS[weekday] ?? iso;
  }

  return iso;
}
