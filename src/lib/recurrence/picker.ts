import { z } from "zod";

import { parseLocalIsoDate } from "./dates";

export const repeatFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);
export type RepeatFrequency = z.infer<typeof repeatFrequencySchema>;

export const rruleWeekdaySchema = z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"]);
export type RruleWeekday = z.infer<typeof rruleWeekdaySchema>;

export const RRULE_WEEKDAYS: readonly RruleWeekday[] = [
  "SU",
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
] as const;

export const repeatEndsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("never") }),
  z.object({ kind: z.literal("count"), count: z.number().int().min(1).max(999) }),
  z.object({
    kind: z.literal("until"),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
]);
export type RepeatEnds = z.infer<typeof repeatEndsSchema>;

export const repeatPickerStateSchema = z.object({
  frequency: repeatFrequencySchema,
  interval: z.number().int().min(1).max(99),
  byWeekday: z.array(rruleWeekdaySchema),
  monthDay: z.number().int().min(1).max(31),
  ends: repeatEndsSchema,
});
export type RepeatPickerState = z.infer<typeof repeatPickerStateSchema>;

const WEEKDAY_ORDER: Record<RruleWeekday, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
};

const JS_DAY_TO_RRULE: Record<number, RruleWeekday> = {
  0: "SU",
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
};

function parseRruleParts(rruleText: string): Record<string, string> {
  return Object.fromEntries(
    rruleText.split(";").map((segment) => {
      const [k, v] = segment.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    })
  );
}

function parseUntilToIso(until: string): string {
  const datePart = until.replace(/Z$/i, "").slice(0, 8);
  return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
}

function formatUntilFromIso(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}${m}${d}T120000`;
}

function weekdayFromStartDate(startDate: string): RruleWeekday {
  const day = parseLocalIsoDate(startDate).getDay();
  return JS_DAY_TO_RRULE[day] ?? "MO";
}

export function defaultRepeatPickerState(startDate: string): RepeatPickerState {
  return {
    frequency: "WEEKLY",
    interval: 1,
    byWeekday: [weekdayFromStartDate(startDate)],
    monthDay: Number(startDate.slice(-2)) || 1,
    ends: { kind: "never" },
  };
}

/** Parse a stored RRULE string into Repeat picker state. */
export function parseRruleToPickerState(rruleText: string, startDate: string): RepeatPickerState {
  const parts = parseRruleParts(rruleText);
  const frequency = repeatFrequencySchema.parse(parts.FREQ ?? "WEEKLY");
  const interval = Math.max(1, Number(parts.INTERVAL ?? "1") || 1);

  let byWeekday: RruleWeekday[] = [];
  if (parts.BYDAY) {
    byWeekday = parts.BYDAY.split(",")
      .map((d) => rruleWeekdaySchema.safeParse(d.trim()))
      .filter((r) => r.success)
      .map((r) => r.data)
      .sort((a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b]);
  } else if (frequency === "WEEKLY") {
    byWeekday = [weekdayFromStartDate(startDate)];
  }

  const monthDay = Math.min(31, Math.max(1, Number(parts.BYMONTHDAY ?? startDate.slice(-2)) || 1));

  let ends: RepeatEnds = { kind: "never" };
  if (parts.COUNT) {
    const count = Number(parts.COUNT);
    if (Number.isFinite(count) && count > 0) {
      ends = { kind: "count", count: Math.floor(count) };
    }
  } else if (parts.UNTIL) {
    ends = { kind: "until", until: parseUntilToIso(parts.UNTIL) };
  }

  return repeatPickerStateSchema.parse({
    frequency,
    interval,
    byWeekday,
    monthDay,
    ends,
  });
}

/** Serialize Repeat picker state to an RRULE string (without the `RRULE:` prefix). */
export function serializePickerStateToRrule(state: RepeatPickerState, startDate: string): string {
  const parsed = repeatPickerStateSchema.parse(state);
  const segments = [`FREQ=${parsed.frequency}`];

  if (parsed.interval > 1) {
    segments.push(`INTERVAL=${parsed.interval}`);
  }

  if (parsed.frequency === "WEEKLY") {
    const days = parsed.byWeekday.length > 0 ? parsed.byWeekday : [weekdayFromStartDate(startDate)];
    segments.push(`BYDAY=${days.join(",")}`);
  }

  if (parsed.frequency === "MONTHLY") {
    segments.push(`BYMONTHDAY=${parsed.monthDay}`);
  }

  if (parsed.ends.kind === "count") {
    segments.push(`COUNT=${parsed.ends.count}`);
  } else if (parsed.ends.kind === "until") {
    segments.push(`UNTIL=${formatUntilFromIso(parsed.ends.until)}`);
  }

  return segments.join(";");
}
