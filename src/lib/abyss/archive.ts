import { DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS } from "@/lib/settings/constants";
import { ageInDays } from "./grouping";
export interface ArchivableItem {
  id: string;
  status: "active" | "promoted" | "archived";
  lastTouchedAt: Date;
}
export function resolveArchiveThresholdDays(setting: number | null | undefined): number {
  if (typeof setting === "number" && Number.isInteger(setting) && setting > 0) return setting;
  return DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS;
}
export function selectItemsToArchive(
  items: readonly ArchivableItem[],
  now: Date,
  thresholdDays: number
): string[] {
  if (thresholdDays <= 0) return [];
  return items
    .filter(
      (item) => item.status === "active" && ageInDays(now, item.lastTouchedAt) >= thresholdDays
    )
    .map((item) => item.id);
}
