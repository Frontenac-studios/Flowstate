"use client";
import { useMemo } from "react";
import {
  buildConstellations,
  buildSkyStars,
  type ConstellationItem,
} from "@/lib/abyss/constellations";
import { filterItems, type AbyssAgeFilter, type AbyssItemType } from "@/lib/abyss/grouping";
import type { AbyssListItem } from "./AbyssList";
import "./abyss-motion.css";
type Props = {
  items: AbyssListItem[];
  query: string;
  typeFilter: AbyssItemType[];
  ageFilter: AbyssAgeFilter;
  now: Date;
  archiveAfterDays?: number;
};
export default function AbyssSky({
  items,
  query,
  typeFilter,
  ageFilter,
  now,
  archiveAfterDays,
}: Props) {
  const filtered = useMemo(
    () =>
      filterItems(
        items.filter((i) => i.status === "active"),
        { types: typeFilter, age: ageFilter, query },
        now
      ),
    [items, typeFilter, ageFilter, query, now]
  );
  const constellationItems: ConstellationItem[] = useMemo(
    () =>
      filtered.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        embedding: i.embedding,
        resurfaceCount: i.resurfaceCount,
        lastTouchedAt: i.lastTouchedAt,
        tags: i.tags,
        status: i.status,
      })),
    [filtered]
  );
  const stars = useMemo(
    () => buildSkyStars(constellationItems, { archiveAfterDays, now }),
    [constellationItems, archiveAfterDays, now]
  );
  const constellations = useMemo(
    () => buildConstellations(constellationItems),
    [constellationItems]
  );
  const starById = useMemo(() => new Map(stars.map((s) => [s.id, s])), [stars]);
  if (!stars.length)
    return (
      <div className="flex min-h-[20rem] flex-1 items-center justify-center rounded-card border border-abyss-border bg-abyss-bg text-meta text-abyss-ink-muted">
        Empty sky
      </div>
    );
  return (
    <div className="relative min-h-[20rem] flex-1 overflow-hidden rounded-card border border-abyss-border bg-abyss-bg">
      <svg
        viewBox="0 0 100 100"
        className="h-full min-h-[20rem] w-full"
        aria-label="Abyss starfield"
      >
        {constellations.flatMap((c) =>
          c.memberIds.flatMap((fromId, i) =>
            c.memberIds.slice(i + 1).map((toId) => {
              const from = starById.get(fromId);
              const to = starById.get(toId);
              return from && to ? (
                <line
                  key={`${c.id}:${fromId}-${toId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="var(--abyss-ink-faint)"
                  strokeOpacity={0.35}
                  strokeWidth={0.15}
                />
              ) : null;
            })
          )
        )}
        {stars.map((star) =>
          star.type === "task" ? (
            <circle
              key={star.id}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill="none"
              stroke="var(--abyss-ink)"
              strokeOpacity={star.opacity}
              strokeWidth={0.35}
              className={star.pulse ? "abyss-star-twinkle" : undefined}
              style={{ ["--star-opacity" as string]: String(star.opacity) }}
            />
          ) : (
            <circle
              key={star.id}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill="var(--abyss-ink)"
              fillOpacity={star.opacity}
              className={star.pulse ? "abyss-star-twinkle" : undefined}
              style={{ ["--star-opacity" as string]: String(star.opacity) }}
            />
          )
        )}
      </svg>
    </div>
  );
}
