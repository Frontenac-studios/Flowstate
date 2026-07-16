"use client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { selectEmergingCluster } from "@/lib/abyss/clustering";
import type { AbyssAgeFilter, AbyssGroupMode, AbyssItemType } from "@/lib/abyss/grouping";
import { isMonthlyReviewDue } from "@/lib/abyss/monthly-review";
import { readLastReviewMonth } from "@/lib/abyss/review-storage";
import { surfaceVariantForView, type AbyssViewMode } from "@/lib/abyss/surface-variant";
import { useAbyssDailyArchiveSweep } from "@/hooks/useAbyssDailyArchiveSweep";
import { useTRPC } from "@/trpc/client";
import AbyssArchivedList from "./AbyssArchivedList";
import AbyssComposer from "./AbyssComposer";
import AbyssEmergingCard from "./AbyssEmergingCard";
import AbyssFloatingBar from "./AbyssFloatingBar";
import AbyssList, { type AbyssListItem } from "./AbyssList";
import AbyssMonthlyReview from "./AbyssMonthlyReview";
import AbyssSky from "./AbyssSky";
import AbyssThemes from "./AbyssThemes";
import { useAbyssEmbedding } from "./useAbyssEmbedding";

function readCategoryLens(param: string | null): ProjectCategory | null {
  if (!param) return null;
  return PROJECT_CATEGORIES.includes(param as ProjectCategory) ? (param as ProjectCategory) : null;
}

export default function AbyssRoot() {
  const searchParams = useSearchParams();
  const categoryLens = readCategoryLens(searchParams.get("category"));
  const trpc = useTRPC();
  const { data, isLoading, isError, refetch } = useQuery(trpc.abyss.list.queryOptions());
  const { data: archived } = useQuery(trpc.abyss.listArchived.queryOptions());
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const embedAndStore = useAbyssEmbedding();
  const embedAttempted = useRef<Set<string>>(new Set());
  useAbyssDailyArchiveSweep();

  useEffect(() => {
    if (!data) return;
    for (const item of data) {
      if (
        (Array.isArray(item.embedding) && item.embedding.length > 0) ||
        embedAttempted.current.has(item.id)
      )
        continue;
      embedAttempted.current.add(item.id);
      void embedAndStore(item.id, item.title, false);
    }
  }, [data, embedAndStore]);

  const [view, setView] = useState<AbyssViewMode>("list");
  const [showArchive, setShowArchive] = useState(false);
  const [showMonthlyReview, setShowMonthlyReview] = useState(false);
  const [groupMode, setGroupMode] = useState<AbyssGroupMode>("category");
  const [typeFilter, setTypeFilter] = useState<AbyssItemType[]>([]);
  const [ageFilter, setAgeFilter] = useState<AbyssAgeFilter>("all");
  const [query, setQuery] = useState("");
  const [now] = useState(() => new Date());
  const [dismissedCluster, setDismissedCluster] = useState<string | null>(null);

  const surface = surfaceVariantForView(view);

  const emerging = useMemo(() => {
    const rows = data ?? [];
    const untagged = rows
      .filter(
        (r) =>
          r.status === "active" &&
          (r.tags?.length ?? 0) === 0 &&
          Array.isArray(r.embedding) &&
          r.embedding.length > 0
      )
      .map((r) => ({ id: r.id, embedding: r.embedding as number[] }));
    const cluster = selectEmergingCluster(untagged);
    if (!cluster) return null;
    const signature = [...cluster.ids].sort().join(",");
    if (signature === dismissedCluster) return null;
    return {
      signature,
      members: cluster.ids
        .map((id) => rows.find((r) => r.id === id))
        .filter(Boolean)
        .map((r) => ({ id: r!.id, title: r!.title, tags: r!.tags ?? null })),
    };
  }, [data, dismissedCluster]);

  useEffect(() => {
    if (isMonthlyReviewDue(readLastReviewMonth(), now)) setShowMonthlyReview(true);
  }, [now]);

  const items = useMemo(() => {
    const rows = (data ?? []) as AbyssListItem[];
    if (!categoryLens) return rows;
    return rows.filter((item) => item.category === categoryLens);
  }, [data, categoryLens]);

  const reviewItems = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        embedding: i.embedding,
        resurfaceCount: i.resurfaceCount,
        lastTouchedAt: i.lastTouchedAt,
        tags: i.tags,
        status: i.status,
      })),
    [items]
  );

  const clearFilters = () => {
    setTypeFilter([]);
    setAgeFilter("all");
    setQuery("");
  };

  const archivedCount = archived?.length ?? 0;
  const hasItems = items.length > 0;

  return (
    <div
      className={`abyss-root flex min-h-full flex-1 flex-col gap-3 text-abyss-ink ${
        surface === "light" ? "bg-bg" : "rounded-card bg-abyss-bg p-3"
      }`}
      data-abyss-theme={surface}
    >
      {/* Sticky title row carries the bar treatment so the h1 and toolbar stick together. */}
      <div className="sticky top-0 z-sticky flex flex-wrap items-center justify-between gap-3 rounded-card border border-abyss-border bg-abyss-bar px-3 py-2 backdrop-blur-md">
        <h1 className="text-xl font-semibold text-abyss-ink">Backlog</h1>
        <AbyssFloatingBar
          view={view}
          onViewChange={setView}
          query={query}
          onQueryChange={setQuery}
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          ageFilter={ageFilter}
          onAgeFilterChange={setAgeFilter}
          showArchive={showArchive}
          onArchiveToggle={() => setShowArchive((v) => !v)}
          hasItems={hasItems}
          archivedCount={archivedCount}
        />
      </div>
      {showMonthlyReview ? (
        <AbyssMonthlyReview
          items={reviewItems}
          now={now}
          onDismiss={() => setShowMonthlyReview(false)}
        />
      ) : null}
      {showArchive ? (
        <section>
          <h2 className="text-meta text-abyss-ink-muted">Archive</h2>
          <AbyssArchivedList />
        </section>
      ) : null}
      {view === "sky" ? (
        <AbyssSky
          items={items}
          query={query}
          typeFilter={typeFilter}
          ageFilter={ageFilter}
          now={now}
          archiveAfterDays={settings?.abyssArchiveAfterDays}
        />
      ) : view === "themes" ? (
        <AbyssThemes
          items={items}
          query={query}
          typeFilter={typeFilter}
          ageFilter={ageFilter}
          now={now}
        />
      ) : (
        <>
          <AbyssComposer />
          {emerging ? (
            <AbyssEmergingCard
              members={emerging.members}
              onDismiss={() => setDismissedCluster(emerging.signature)}
            />
          ) : null}
          {isLoading ? (
            <div aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-row bg-abyss-surface" />
              ))}
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="rounded-row border border-abyss-border bg-abyss-surface p-4 text-center text-meta text-abyss-ink-muted"
            >
              <p>The deep didn&apos;t load.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-2 rounded-control px-3 py-1 text-abyss-ink underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : (
            <AbyssList
              items={items}
              groupMode={groupMode}
              typeFilter={typeFilter}
              ageFilter={ageFilter}
              query={query}
              now={now}
              onClearFilters={clearFilters}
            />
          )}
        </>
      )}
    </div>
  );
}
