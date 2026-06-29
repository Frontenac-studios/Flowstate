"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { AbyssAgeFilter, AbyssGroupMode, AbyssItemType } from "@/lib/abyss/grouping";
import { readAbyssTheme, writeAbyssTheme, type AbyssTheme } from "@/lib/abyss/theme-storage";
import { useTRPC } from "@/trpc/client";

import AbyssComposer from "./AbyssComposer";
import AbyssFloatingBar, { type AbyssView } from "./AbyssFloatingBar";
import AbyssList, { type AbyssListItem } from "./AbyssList";
import { useAbyssEmbedding } from "./useAbyssEmbedding";

function SkyPlaceholder() {
  return (
    <div className="relative flex min-h-[20rem] flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-abyss-border bg-abyss-bg text-center">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
        {[
          [12, 18],
          [28, 60],
          [44, 30],
          [62, 72],
          [78, 22],
          [88, 54],
          [20, 84],
          [70, 12],
        ].map(([left, top], i) => (
          <span
            key={i}
            className="absolute h-px w-px rounded-full bg-abyss-ink-faint"
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        ))}
      </div>
      <p className="text-subtitle text-abyss-ink">Stargaze mode</p>
      <p className="max-w-xs text-meta text-abyss-ink-muted">
        The constellation sky — type-as-star-styles and clustered themes — arrives with the
        embedding pass. For now, the List leads.
      </p>
    </div>
  );
}

export default function AbyssRoot() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.abyss.list.queryOptions());

  // Backfill embeddings for items captured server-side (chat "park…", Drop) or before
  // §7A. Quiet (no duplicate-check) and attempted once per id per session.
  const embedAndStore = useAbyssEmbedding();
  const embedAttempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!data) return;
    for (const item of data) {
      const hasEmbedding = Array.isArray(item.embedding) && item.embedding.length > 0;
      if (hasEmbedding || embedAttempted.current.has(item.id)) continue;
      embedAttempted.current.add(item.id);
      void embedAndStore(item.id, item.title, false);
    }
  }, [data, embedAndStore]);

  const [theme, setTheme] = useState<AbyssTheme>("dark");
  const [view, setView] = useState<AbyssView>("list");
  const [groupMode, setGroupMode] = useState<AbyssGroupMode>("category");
  const [typeFilter, setTypeFilter] = useState<AbyssItemType[]>([]);
  const [ageFilter, setAgeFilter] = useState<AbyssAgeFilter>("all");
  const [query, setQuery] = useState("");
  const [now] = useState(() => new Date());

  useEffect(() => {
    setTheme(readAbyssTheme());
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      writeAbyssTheme(next);
      return next;
    });
  };

  const items = (data ?? []) as AbyssListItem[];

  return (
    <div
      className="abyss-root flex min-h-full flex-1 flex-col gap-3 rounded-card bg-abyss-bg p-3 text-abyss-ink"
      data-abyss-theme={theme}
    >
      <AbyssFloatingBar
        view={view}
        onViewChange={setView}
        theme={theme}
        onThemeToggle={toggleTheme}
        query={query}
        onQueryChange={setQuery}
        groupMode={groupMode}
        onGroupModeChange={setGroupMode}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        ageFilter={ageFilter}
        onAgeFilterChange={setAgeFilter}
      />

      {view === "sky" ? (
        <SkyPlaceholder />
      ) : (
        <>
          <AbyssComposer />
          {isLoading ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading the abyss">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-row bg-abyss-surface" />
              ))}
            </div>
          ) : (
            <AbyssList
              items={items}
              groupMode={groupMode}
              typeFilter={typeFilter}
              ageFilter={ageFilter}
              query={query}
              now={now}
            />
          )}
        </>
      )}
    </div>
  );
}
