const RRULE_DAY_LABELS: Record<string, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

function formatEndsSuffix(parts: Record<string, string | undefined>): string {
  if (parts.COUNT) {
    return `, ${parts.COUNT} time${parts.COUNT === "1" ? "" : "s"}`;
  }
  if (parts.UNTIL) {
    const untilIso = parts.UNTIL.slice(0, 8);
    const formatted = `${untilIso.slice(4, 6)}/${untilIso.slice(6, 8)}/${untilIso.slice(0, 4)}`;
    return `, until ${formatted}`;
  }
  return "";
}

/** Human label for a stored RRULE string (Repeat picker + ↻ badge title). */
export function formatRruleLabel(rruleText: string): string {
  const parts = Object.fromEntries(
    rruleText.split(";").map((segment) => {
      const [k, v] = segment.split("=");
      return [k?.trim(), v?.trim()];
    })
  ) as Record<string, string | undefined>;

  const freq = parts.FREQ ?? "DAILY";
  const interval = Number(parts.INTERVAL ?? "1");
  const ends = formatEndsSuffix(parts);

  if (freq === "DAILY") {
    const base = interval === 1 ? "Daily" : `Every ${interval} days`;
    return `${base}${ends}`;
  }

  if (freq === "WEEKLY") {
    const byday = parts.BYDAY?.split(",")
      .map((d) => RRULE_DAY_LABELS[d] ?? d)
      .join(", ");
    if (interval === 2) {
      const base = byday ? `Every other ${byday}` : "Every other week";
      return `${base}${ends}`;
    }
    if (byday) return `Every ${byday}${ends}`;
    const base = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
    return `${base}${ends}`;
  }

  if (freq === "MONTHLY") {
    const day = parts.BYMONTHDAY;
    const base = day
      ? `Monthly on day ${day}`
      : interval === 1
        ? "Monthly"
        : `Every ${interval} months`;
    return `${base}${ends}`;
  }

  return `Repeats${ends}`;
}
