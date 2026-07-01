export type LiftsMePractice = {
  activityId: string;
  title: string;
  reason: "explicit" | "regular";
};

export function deriveLiftsMe(input: {
  activities: ReadonlyArray<{ id: string; title: string; liftsMe: boolean }>;
  events: ReadonlyArray<{ activityId: string | null; occurredAt: Date }>;
  regularsThreshold?: number;
  windowDays?: number;
  now?: Date;
}): LiftsMePractice[] {
  const regularsThreshold = input.regularsThreshold ?? 3;
  const windowDays = input.windowDays ?? 30;
  const now = input.now ?? new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const counts = new Map<string, number>();
  for (const event of input.events) {
    if (!event.activityId || event.occurredAt < windowStart) continue;
    counts.set(event.activityId, (counts.get(event.activityId) ?? 0) + 1);
  }

  const results = new Map<string, LiftsMePractice>();
  for (const activity of input.activities) {
    if (activity.liftsMe) {
      results.set(activity.id, {
        activityId: activity.id,
        title: activity.title,
        reason: "explicit",
      });
      continue;
    }
    if ((counts.get(activity.id) ?? 0) >= regularsThreshold) {
      results.set(activity.id, {
        activityId: activity.id,
        title: activity.title,
        reason: "regular",
      });
    }
  }

  return Array.from(results.values()).sort((a, b) => a.title.localeCompare(b.title));
}
