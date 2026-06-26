const RRULE_DAY_LABELS: Record<string, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

/** Human label for a stored RRULE string (Repeat picker + ↻ badge title). */
export function formatRruleLabel(rruleText: string): string {
  const parts = Object.fromEntries(
    rruleText.split(";").map((segment) => {
      const [k, v] = segment.split("=");
      return [k?.trim(), v?.trim()];
    })
  );

  const freq = parts.FREQ ?? "DAILY";
  const interval = Number(parts.INTERVAL ?? "1");

  if (freq === "DAILY") {
    return interval === 1 ? "Daily" : `Every ${interval} days`;
  }

  if (freq === "WEEKLY") {
    const byday = parts.BYDAY?.split(",")
      .map((d) => RRULE_DAY_LABELS[d] ?? d)
      .join(", ");
    if (interval === 2) return byday ? `Every other ${byday}` : "Every other week";
    if (byday) return `Every ${byday}`;
    return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
  }

  if (freq === "MONTHLY") {
    const day = parts.BYMONTHDAY;
    if (day) return `Monthly on day ${day}`;
    return interval === 1 ? "Monthly" : `Every ${interval} months`;
  }

  return "Repeats";
}
