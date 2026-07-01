import { clusterByEmbedding, type ClusterableItem } from "./clustering";
import { ageInDays, ARCHIVE_AFTER_DAYS, DIMMING_AFTER_DAYS } from "./grouping";
export interface SkyStar {
  id: string;
  x: number;
  y: number;
  type: "idea" | "task";
  opacity: number;
  radius: number;
  pulse: boolean;
}
export type ConstellationKind = "tag" | "embedding";
export interface Constellation {
  id: string;
  kind: ConstellationKind;
  label: string;
  memberIds: string[];
  brightness: number;
}
export interface ConstellationItem extends ClusterableItem {
  type: "idea" | "task";
  resurfaceCount: number;
  lastTouchedAt: Date;
  tags?: string[] | null;
  title: string;
  status?: "active" | "promoted" | "archived";
}
function unitFromId(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 10_000) / 10_000;
}
function starPosition(id: string) {
  return { x: 6 + unitFromId(id, 1) * 88, y: 6 + unitFromId(id, 7) * 88 };
}
function starOpacity(item: ConstellationItem, archiveAfterDays: number, now: Date): number {
  const age = ageInDays(now, item.lastTouchedAt);
  const brighten = Math.min(1, 0.35 + item.resurfaceCount * 0.12);
  const dim =
    age <= DIMMING_AFTER_DAYS
      ? 1
      : Math.max(
          0.2,
          1 - (age - DIMMING_AFTER_DAYS) / Math.max(1, archiveAfterDays - DIMMING_AFTER_DAYS)
        );
  return Math.min(1, brighten * dim);
}
export function buildSkyStars(
  items: readonly ConstellationItem[],
  options?: { archiveAfterDays?: number; now?: Date }
): SkyStar[] {
  const archiveAfterDays = options?.archiveAfterDays ?? ARCHIVE_AFTER_DAYS;
  const now = options?.now ?? new Date();
  return items.map((item) => {
    const { x, y } = starPosition(item.id);
    return {
      id: item.id,
      x,
      y,
      type: item.type,
      opacity: starOpacity(item, archiveAfterDays, now),
      radius: item.type === "task" ? 2.2 : 2.8,
      pulse: item.resurfaceCount >= 3,
    };
  });
}
export function buildConstellations(items: readonly ConstellationItem[]): Constellation[] {
  const out: Constellation[] = [];
  const tagMap = new Map<string, string[]>();
  for (const item of items)
    for (const tag of item.tags ?? []) tagMap.set(tag, [...(tagMap.get(tag) ?? []), item.id]);
  for (const [tag, memberIds] of Array.from(tagMap.entries())) {
    if (memberIds.length < 2) continue;
    out.push({
      id: `tag:${tag}`,
      kind: "tag",
      label: tag,
      memberIds,
      brightness: memberIds.reduce(
        (sum: number, id: string) => sum + (items.find((i) => i.id === id)?.resurfaceCount ?? 0),
        0
      ),
    });
  }
  for (const cluster of clusterByEmbedding(items, { minSize: 2 })) {
    if (cluster.ids.some((id) => (items.find((i) => i.id === id)?.tags?.length ?? 0) > 0)) continue;
    out.push({
      id: `embed:${cluster.ids.slice().sort().join(",")}`,
      kind: "embedding",
      label: "Emerging theme",
      memberIds: cluster.ids,
      brightness: cluster.ids.reduce(
        (sum: number, id: string) => sum + (items.find((i) => i.id === id)?.resurfaceCount ?? 0),
        0
      ),
    });
  }
  return out.sort((a, b) => b.brightness - a.brightness || a.label.localeCompare(b.label));
}
