import { buildConstellations, type ConstellationItem } from "./constellations";
import { selectKeepsCalling, type AbyssGroupableItem } from "./grouping";
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function isMonthlyReviewDue(lastReviewMonth: string | null, now: Date): boolean {
  return lastReviewMonth !== monthKey(now);
}
export interface MonthlyReview {
  monthKey: string;
  constellations: { id: string; label: string; memberIds: string[]; brightness: number }[];
  keepsCalling: AbyssGroupableItem[];
}
export function buildMonthlyReview(items: readonly ConstellationItem[], now: Date): MonthlyReview {
  const active = items.filter((i) => i.status !== "archived");
  const constellations = buildConstellations(active).map((c) => ({
    id: c.id,
    label: c.label,
    memberIds: c.memberIds,
    brightness: c.brightness,
  }));
  const keepsCalling = selectKeepsCalling(
    active.map((i) => ({
      id: i.id,
      title: i.title,
      note: null,
      type: i.type,
      category: null,
      status: "active" as const,
      resurfaceCount: i.resurfaceCount,
      lastTouchedAt: i.lastTouchedAt,
      tags: i.tags,
    }))
  );
  return { monthKey: monthKey(now), constellations, keepsCalling };
}
