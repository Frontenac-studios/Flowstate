"use client";

import { useMemo } from "react";

import { Sparkles, withKashIcon } from "@/components/kash/ui/icon";
import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import { clusterByEmbedding } from "@/lib/abyss/clustering";
import {
  filterItems,
  selectKeepsCalling,
  type AbyssAgeFilter,
  type AbyssItemType,
} from "@/lib/abyss/grouping";
import { categorySolidVar } from "@/lib/projects/category-tokens";

import type { AbyssListItem } from "./AbyssList";

const SparkleIcon = withKashIcon(Sparkles);

type Props = {
  items: AbyssListItem[];
  query: string;
  typeFilter: AbyssItemType[];
  ageFilter: AbyssAgeFilter;
  now: Date;
};

function ClusterCard({
  title,
  count,
  members,
}: {
  title: string;
  count: number;
  members: AbyssListItem[];
}) {
  return (
    <article className="rounded-card border border-abyss-border bg-abyss-surface p-3">
      <div className="flex items-center gap-2">
        <SparkleIcon size={14} className="text-cat-adulting" />
        <h3 className="text-meta font-medium text-abyss-ink">{title}</h3>
        <span className="text-caption text-abyss-ink-faint">· {count}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {members.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: item.category
                  ? categorySolidVar(item.category)
                  : "var(--abyss-border)",
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-body text-abyss-ink">{item.title}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** B2 — light cluster-card lens leading with keeps-calling-you patterns. */
export default function AbyssThemes({ items, query, typeFilter, ageFilter, now }: Props) {
  const filtered = useMemo(
    () =>
      filterItems(
        items.filter((i) => i.status === "active"),
        { types: typeFilter, age: ageFilter, query },
        now
      ),
    [items, typeFilter, ageFilter, query, now]
  );

  const keepsCalling = useMemo(() => selectKeepsCalling(filtered), [filtered]);

  const embeddingClusters = useMemo(() => {
    const keepsIds = new Set(keepsCalling.map((i) => i.id));
    const clusters = clusterByEmbedding(
      filtered.filter((i) => Array.isArray(i.embedding) && i.embedding.length > 0)
    );
    return clusters
      .filter((cluster) => !cluster.ids.every((id) => keepsIds.has(id)))
      .map((cluster) => ({
        key: cluster.ids.join(","),
        members: cluster.ids
          .map((id) => filtered.find((i) => i.id === id))
          .filter((i): i is AbyssListItem => i != null),
      }))
      .filter((c) => c.members.length >= 3);
  }, [filtered, keepsCalling]);

  if (items.length === 0) {
    return (
      <ColoredEmptyInvitation
        title="The deep is empty"
        hint="Park a backburner idea or deferred task — themes will surface once patterns emerge."
        className="border-abyss-border bg-abyss-surface"
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="px-2.5 py-8 text-center text-meta text-abyss-ink-muted">Nothing matches.</p>
    );
  }

  if (keepsCalling.length === 0 && embeddingClusters.length === 0) {
    return (
      <ColoredEmptyInvitation
        title="Not enough for themes yet"
        hint="Keep parking related ideas — clusters appear once a pattern repeats."
        className="border-abyss-border bg-abyss-surface"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {keepsCalling.length > 0 ? (
        <ClusterCard title="Keeps calling you" count={keepsCalling.length} members={keepsCalling} />
      ) : null}
      {embeddingClusters.map((cluster) => (
        <ClusterCard
          key={cluster.key}
          title="Emerging pattern"
          count={cluster.members.length}
          members={cluster.members}
        />
      ))}
    </div>
  );
}
