import type { SlippedTop3Task, StalledTop3Task } from "./evaluate-top3-stall";

const SLOT_LABELS = ["①", "②", "③"] as const;

function slotLabel(order: number): string {
  return SLOT_LABELS[order - 1] ?? `${order}`;
}

export function templateStallNudge(stalled: StalledTop3Task[], slipped: SlippedTop3Task[]): string {
  if (stalled.length === 0) {
    return "Your Top 3 could use a look — worth a ⌘D pick when you're ready.";
  }

  const primary = stalled[0]!;
  const slot = slotLabel(primary.top3Order);
  let text = `It's past 2pm — **${slot} ${primary.title}** is still on your Top 3 and hasn't had focus time today. Worth a ⌘D pick?`;

  if (stalled.length > 1) {
    const others = stalled
      .slice(1)
      .map((t) => `${slotLabel(t.top3Order)} ${t.title}`)
      .join(", ");
    text += ` Also waiting: ${others}.`;
  }

  const slippedNotStalled = slipped.filter((s) => !stalled.some((t) => t.id === s.id));
  if (slippedNotStalled.length > 0) {
    const names = slippedNotStalled
      .map((t) => `${slotLabel(t.top3Order)} ${t.title} (${t.daysSlipped}d)`)
      .join(", ");
    text += ` Heads up — ${names} has been on your Top 3 for a few days.`;
  }

  return text;
}
