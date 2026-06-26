import { RRule, rrulestr } from "rrule";

import { endOfLocalIsoDay, formatLocalIsoDate, parseLocalIsoDate } from "./dates";
import type { ExpandedOccurrence, OccurrenceOverrideInput, RecurrenceWindow } from "./types";

/**
 * rrule.js parses an UNTIL value as UTC, but we anchor occurrences to local
 * wall-clock (noon, via parseLocalIsoDate). That mismatch makes the UNTIL
 * boundary land a calendar day off depending on the runner's timezone. Re-read
 * the UNTIL's calendar fields and rebuild it in local time so the comparison is
 * timezone-stable everywhere (CI/Vercel run in UTC; dev machines do not).
 */
function localizeUntil(until: Date | null): Date | undefined {
  if (!until) return undefined;
  return new Date(
    until.getUTCFullYear(),
    until.getUTCMonth(),
    until.getUTCDate(),
    until.getUTCHours(),
    until.getUTCMinutes(),
    until.getUTCSeconds()
  );
}

function buildRule(rruleText: string, startDate: string) {
  const dtstart = parseLocalIsoDate(startDate);
  const parsed = rrulestr(`RRULE:${rruleText}`, { dtstart });
  if (!parsed.origOptions.until) return parsed;
  return new RRule({
    ...parsed.origOptions,
    dtstart,
    until: localizeUntil(parsed.origOptions.until),
  });
}

function isPendingOccurrence(override: OccurrenceOverrideInput | undefined): boolean {
  if (!override) return true;
  if (override.status === "skipped" || override.status === "completed") return false;
  return true;
}

/**
 * Expand a recurrence rule into virtual occurrence rows for a date window, merging
 * per-date overrides (skip / complete / reschedule / edit-this-only).
 */
export function expandOccurrences(
  rruleText: string,
  startDate: string,
  window: RecurrenceWindow,
  overrides: OccurrenceOverrideInput[] = []
): ExpandedOccurrence[] {
  const rule = buildRule(rruleText, startDate);
  const windowStart = parseLocalIsoDate(window.start);
  const windowEnd = endOfLocalIsoDay(window.end);

  const rawDates = rule.between(windowStart, windowEnd, true);
  const overrideByDate = new Map(overrides.map((o) => [o.occurrenceDate, o]));

  const results: ExpandedOccurrence[] = [];
  const seenDisplayDates = new Set<string>();

  for (const date of rawDates) {
    const occurrenceDate = formatLocalIsoDate(date);
    const override = overrideByDate.get(occurrenceDate);

    if (!isPendingOccurrence(override)) continue;

    if (override?.status === "rescheduled" && override.movedToDate) {
      if (
        override.movedToDate >= window.start &&
        override.movedToDate <= window.end &&
        !seenDisplayDates.has(`${occurrenceDate}->${override.movedToDate}`)
      ) {
        seenDisplayDates.add(`${occurrenceDate}->${override.movedToDate}`);
        results.push({
          occurrenceDate,
          displayDate: override.movedToDate,
          patch: null,
        });
      }
      continue;
    }

    const patch = override?.status === "edited" ? override.patch : null;
    if (!seenDisplayDates.has(`${occurrenceDate}->${occurrenceDate}`)) {
      seenDisplayDates.add(`${occurrenceDate}->${occurrenceDate}`);
      results.push({
        occurrenceDate,
        displayDate: occurrenceDate,
        patch,
      });
    }
  }

  // Rescheduled occurrences whose rule-date falls outside the window but land inside it.
  for (const override of overrides) {
    if (override.status !== "rescheduled" || !override.movedToDate) continue;
    if (override.movedToDate < window.start || override.movedToDate > window.end) continue;
    const key = `${override.occurrenceDate}->${override.movedToDate}`;
    if (seenDisplayDates.has(key)) continue;
    seenDisplayDates.add(key);
    results.push({
      occurrenceDate: override.occurrenceDate,
      displayDate: override.movedToDate,
      patch: null,
    });
  }

  return results.sort((a, b) => a.displayDate.localeCompare(b.displayDate));
}

/** Next pending occurrence on or after `fromDate` (ISO), or null when the series ends. */
export function nextOccurrence(
  rruleText: string,
  startDate: string,
  fromDate: string,
  overrides: OccurrenceOverrideInput[] = []
): string | null {
  const from = parseLocalIsoDate(fromDate);
  const horizon = new Date(from);
  horizon.setFullYear(horizon.getFullYear() + 2);

  const rule = buildRule(rruleText, startDate);
  const candidates = rule.between(from, horizon, true);
  const overrideByDate = new Map(overrides.map((o) => [o.occurrenceDate, o]));

  for (const date of candidates) {
    const occurrenceDate = formatLocalIsoDate(date);
    const override = overrideByDate.get(occurrenceDate);
    if (!isPendingOccurrence(override)) continue;
    if (override?.status === "rescheduled" && override.movedToDate) {
      return override.movedToDate;
    }
    return occurrenceDate;
  }

  for (const override of overrides) {
    if (override.status !== "rescheduled" || !override.movedToDate) continue;
    if (override.movedToDate < fromDate) continue;
    return override.movedToDate;
  }

  return null;
}
