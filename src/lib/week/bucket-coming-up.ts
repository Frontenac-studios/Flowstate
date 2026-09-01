/**
 * W14 — the Week steering deck, "Coming up" block. Dated deliverables across every
 * client for the next fortnight, split into two calm buckets: this week / next week.
 * Overdue is excluded on purpose — it belongs on Today, not the forward-looking deck.
 * Pure and date-string based (YYYY-MM-DD compares lexicographically), so it runs the
 * same on the server and in a fixture test; the router supplies the window edges.
 */

export type ComingUpKind = "task" | "milestone";

export type ComingUpItem = {
  id: string;
  title: string;
  /** Due day, YYYY-MM-DD (task scheduledDate or milestone targetDate). */
  date: string;
  kind: ComingUpKind;
  category: "business" | "personal";
  /** Client read by name, never colour; null when the project has no client. */
  clientName: string | null;
  projectName: string;
};

export type ComingUpBuckets = {
  thisWeek: ComingUpItem[];
  nextWeek: ComingUpItem[];
};

export function bucketComingUp(params: {
  items: ReadonlyArray<ComingUpItem>;
  /** Local today, YYYY-MM-DD. Anything before this is overdue and dropped. */
  todayIso: string;
  /** Sunday of the current ISO week, YYYY-MM-DD — the this-week/next-week divider. */
  thisWeekEndIso: string;
  /** Sunday of next ISO week, YYYY-MM-DD — the 14-day horizon; later is dropped. */
  horizonEndIso: string;
}): ComingUpBuckets {
  const thisWeek: ComingUpItem[] = [];
  const nextWeek: ComingUpItem[] = [];

  for (const item of params.items) {
    if (item.date < params.todayIso) continue; // overdue → Today owns it
    if (item.date > params.horizonEndIso) continue; // beyond the fortnight
    if (item.date <= params.thisWeekEndIso) thisWeek.push(item);
    else nextWeek.push(item);
  }

  const byDate = (a: ComingUpItem, b: ComingUpItem) =>
    a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
  thisWeek.sort(byDate);
  nextWeek.sort(byDate);

  return { thisWeek, nextWeek };
}
