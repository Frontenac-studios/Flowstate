export type DailyFrequency = { date: string; count: number };
export type MoodPoint = { date: string; mood: number };

export type CareStatsSummary = {
  frequencyDays: DailyFrequency[];
  totalEvents: number;
  averagePerWeek: number;
  moodPoints: MoodPoint[];
  averageMood: number | null;
  moodPhrase: string;
  frequencyPhrase: string;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gentleFrequencyPhrase(total: number, windowDays: number): string {
  if (total === 0) return "No self-care logged yet this fortnight — that's okay.";
  const perWeek = (total / windowDays) * 7;
  if (perWeek >= 5) return "You've been tending yourself often — a steady rhythm.";
  if (perWeek >= 2) return "A gentle pace — a few moments of care here and there.";
  return "Quiet lately — small acts still count when you're ready.";
}

function gentleMoodPhrase(avg: number | null): string {
  if (avg === null) return "No mood notes yet — optional, whenever it helps.";
  if (avg >= 4) return "Reflections have felt mostly bright lately.";
  if (avg >= 3) return "A mixed stretch — room for both wins and rest.";
  return "Some heavy days noted — be gentle with yourself.";
}

export function buildCareStatsSummary(input: {
  events: ReadonlyArray<{ occurredAt: Date }>;
  reflections: ReadonlyArray<{ reflectionDate: string; mood: number | null }>;
  windowDays?: number;
  now?: Date;
}): CareStatsSummary {
  const windowDays = input.windowDays ?? 14;
  const now = input.now ?? new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));

  const dateKey = (date: Date) => date.toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  for (let i = 0; i < windowDays; i++) {
    const day = new Date(windowStart);
    day.setDate(windowStart.getDate() + i);
    counts.set(dateKey(day), 0);
  }

  let totalEvents = 0;
  for (const event of input.events) {
    if (event.occurredAt < windowStart) continue;
    totalEvents += 1;
    const key = dateKey(event.occurredAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const moodPoints: MoodPoint[] = input.reflections
    .filter((row) => row.mood !== null)
    .map((row) => ({ date: row.reflectionDate, mood: row.mood as number }));

  const averageMood = average(moodPoints.map((point) => point.mood));

  return {
    frequencyDays: Array.from(counts.entries()).map(([date, count]) => ({ date, count })),
    totalEvents,
    averagePerWeek: (totalEvents / windowDays) * 7,
    moodPoints,
    averageMood,
    moodPhrase: gentleMoodPhrase(averageMood),
    frequencyPhrase: gentleFrequencyPhrase(totalEvents, windowDays),
  };
}
