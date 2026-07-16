"use client";

import { Search, withKashIcon } from "@/components/kash/ui/icon";
import type { AbyssAgeFilter, AbyssGroupMode, AbyssItemType } from "@/lib/abyss/grouping";
import type { AbyssViewMode } from "@/lib/abyss/surface-variant";

const SearchIcon = withKashIcon(Search);

const ABYSS_INPUT_FOCUS = "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]";
const ABYSS_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-abyss-accent focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-surface";

export type AbyssView = AbyssViewMode;

type Props = {
  view: AbyssView;
  onViewChange: (view: AbyssView) => void;
  query: string;
  onQueryChange: (q: string) => void;
  groupMode: AbyssGroupMode;
  onGroupModeChange: (mode: AbyssGroupMode) => void;
  typeFilter: AbyssItemType[];
  onTypeFilterChange: (types: AbyssItemType[]) => void;
  ageFilter: AbyssAgeFilter;
  onAgeFilterChange: (age: AbyssAgeFilter) => void;
  showArchive: boolean;
  onArchiveToggle: () => void;
  hasItems: boolean;
  archivedCount: number;
};

const GROUP_LABELS: Record<AbyssGroupMode, string> = {
  category: "Category",
  type: "Type",
  age: "Age",
  pattern: "Pattern",
};

const AGE_LABELS: Record<AbyssAgeFilter, string> = {
  all: "All",
  fresh: "Recent",
  dimming: "Drifting",
};

const VIEW_LABELS: Record<AbyssView, string> = {
  list: "List",
  themes: "Themes",
  sky: "Sky",
};

/**
 * D28 — pre-data: search + view tabs; filters when items exist; archive when non-empty.
 */
export default function AbyssFloatingBar(props: Props) {
  const toggleType = (type: AbyssItemType) => {
    props.onTypeFilterChange(
      props.typeFilter.includes(type)
        ? props.typeFilter.filter((t) => t !== type)
        : [...props.typeFilter, type]
    );
  };

  const showFilters = props.hasItems && props.view === "list";

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <div className="flex min-w-[10rem] flex-1 items-center gap-2 text-abyss-ink-muted">
        <SearchIcon size={14} />
        <input
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          placeholder="Search the deep…"
          className={`min-w-0 flex-1 bg-transparent text-meta text-abyss-ink placeholder:text-abyss-ink-faint ${ABYSS_INPUT_FOCUS}`}
          aria-label="Search backlog items"
        />
      </div>

      {showFilters ? (
        <>
          <label className="flex items-center gap-1.5 text-caption text-abyss-ink-faint">
            Group
            <select
              value={props.groupMode}
              onChange={(e) => props.onGroupModeChange(e.target.value as AbyssGroupMode)}
              className={`rounded-control border border-abyss-border bg-abyss-surface px-1.5 py-1 text-caption text-abyss-ink ${ABYSS_INPUT_FOCUS}`}
              aria-label="Group items by"
            >
              {(Object.keys(GROUP_LABELS) as AbyssGroupMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {GROUP_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1" role="group" aria-label="Filter by type">
            {(["idea", "task"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                aria-pressed={props.typeFilter.includes(type)}
                className={`rounded-pill px-2 py-0.5 text-caption capitalize transition-colors ${ABYSS_BTN_FOCUS} ${
                  props.typeFilter.includes(type)
                    ? "bg-abyss-accent text-abyss-on-accent"
                    : "border border-abyss-border text-abyss-ink-muted hover:text-abyss-ink"
                }`}
              >
                {type}s
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Filter by age">
            {(["all", "fresh", "dimming"] as const).map((age) => (
              <button
                key={age}
                type="button"
                onClick={() => props.onAgeFilterChange(age)}
                aria-pressed={props.ageFilter === age}
                className={`rounded-pill px-2 py-0.5 text-caption transition-colors ${ABYSS_BTN_FOCUS} ${
                  props.ageFilter === age
                    ? "bg-abyss-surface-2 text-abyss-ink"
                    : "text-abyss-ink-faint hover:text-abyss-ink-muted"
                }`}
              >
                {AGE_LABELS[age]}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {props.archivedCount > 0 ? (
        <button
          type="button"
          onClick={props.onArchiveToggle}
          aria-pressed={props.showArchive}
          className={`rounded-pill px-2.5 py-1 text-caption ${ABYSS_BTN_FOCUS} ${
            props.showArchive
              ? "bg-abyss-surface-2 text-abyss-ink"
              : "text-abyss-ink-faint hover:text-abyss-ink-muted"
          }`}
        >
          Archived · {props.archivedCount}
        </button>
      ) : null}

      <div
        className="flex items-center gap-0.5 rounded-pill border border-abyss-border bg-abyss-surface p-0.5"
        role="group"
        aria-label="View"
      >
        {(["list", "themes", "sky"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => props.onViewChange(v)}
            aria-pressed={props.view === v}
            className={`rounded-pill px-3 py-1 text-caption transition-colors ${ABYSS_BTN_FOCUS} ${
              props.view === v
                ? "bg-abyss-accent text-abyss-on-accent"
                : "text-abyss-ink-muted hover:text-abyss-ink"
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
