const WEEKDAY_TO_RRULE: Record<string, string> = {
  sun: "SU",
  mon: "MO",
  tue: "TU",
  wed: "WE",
  thu: "TH",
  fri: "FR",
  sat: "SA",
};

export type ParsedRecurrencePhrase = {
  rrule: string;
  label: string;
};

/**
 * Map composer shorthand (`; every tue`, `daily`, …) to an RRULE string + chip label.
 * Returns null when the segment is not a recurrence phrase.
 */
export function parseRecurrencePhrase(segment: string): ParsedRecurrencePhrase | null {
  const raw = segment.trim().toLowerCase();
  if (!raw) return null;

  if (raw === "daily") {
    return { rrule: "FREQ=DAILY", label: "Daily" };
  }

  if (raw === "weekly" || raw === "every week") {
    return { rrule: "FREQ=WEEKLY", label: "Weekly" };
  }

  if (raw === "every other week") {
    return { rrule: "FREQ=WEEKLY;INTERVAL=2", label: "Every other week" };
  }

  const everyDay = raw.match(/^every\s+(sun|mon|tue|wed|thu|fri|sat)(?:day)?$/);
  if (everyDay) {
    const day = everyDay[1]!;
    const byday = WEEKDAY_TO_RRULE[day];
    if (!byday) return null;
    const label = `Every ${day.charAt(0).toUpperCase()}${day.slice(1)}`;
    return { rrule: `FREQ=WEEKLY;BYDAY=${byday}`, label };
  }

  const monthly = raw.match(/^monthly\s+on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?$/);
  if (monthly) {
    const day = Number(monthly[1]);
    if (day < 1 || day > 31) return null;
    return {
      rrule: `FREQ=MONTHLY;BYMONTHDAY=${day}`,
      label: `Monthly on the ${day}${ordinal(day)}`,
    };
  }

  return null;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
