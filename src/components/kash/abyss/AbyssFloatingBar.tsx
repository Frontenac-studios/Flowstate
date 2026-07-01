"use client";

import { Moon, Search, Sun, withKashIcon } from "@/components/kash/ui/icon";
import type { AbyssAgeFilter, AbyssGroupMode, AbyssItemType } from "@/lib/abyss/grouping";
import type { AbyssTheme } from "@/lib/abyss/theme-storage";

const SearchIcon = withKashIcon(Search);
const SunIcon = withKashIcon(Sun);
const MoonIcon = withKashIcon(Moon);

const ABYSS_INPUT_FOCUS = "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]";
const ABYSS_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-abyss-accent focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-surface";

export type AbyssView = "list" | "sky";

type Props = {
  view: AbyssView;
  onViewChange: (view: AbyssView) => void;
  theme: AbyssTheme;
  onThemeToggle: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  groupMode: AbyssGroupMode;
  onGroupModeChange: (mode: AbyssGroupMode) => void;
  typeFilter: AbyssItemType[];
  onTypeFilterChange: (types: AbyssItemType[]) => void;
  ageFilter: AbyssAgeFilter;
  onAgeFilterChange: (age: AbyssAgeFilter) => void;
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

/**
 * The translucent control bar pinned over the Abyss canvas (placement decided
 * Jun 24): search · grouping · type/age filters · light toggle · List/Sky switch.
 */
export default function AbyssFloatingBar(props: Props) {
  const toggleType = (type: AbyssItemType) => {
    props.onTypeFilterChange(
      props.typeFilter.includes(type)
        ? props.typeFilter.filter((t) => t !== type)
        : [...props.typeFilter, type]
    );
  };

  return (
    <div className="sticky top-0 z-sticky flex flex-wrap items-center gap-2 rounded-card border border-abyss-border bg-abyss-bar px-3 py-2 backdrop-blur-md">
      <div className="flex min-w-[10rem] flex-1 items-center gap-2 text-abyss-ink-muted">
        <SearchIcon size={14} />
        <input
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          placeholder="Search the deep…"
          className={`min-w-0 flex-1 bg-transparent text-meta text-abyss-ink placeholder:text-abyss-ink-faint ${ABYSS_INPUT_FOCUS}`}
          aria-label="Search abyss items"
        />
      </div>

      {props.view === "list" ? (
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

      <button
        type="button"
        onClick={props.onThemeToggle}
        className={`rounded-pill p-1.5 text-abyss-ink-muted transition-colors hover:text-abyss-ink ${ABYSS_BTN_FOCUS}`}
        aria-label={props.theme === "dark" ? "Switch to light" : "Switch to dark"}
      >
        {props.theme === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </button>

      <div
        className="flex items-center gap-0.5 rounded-pill border border-abyss-border bg-abyss-surface p-0.5"
        role="group"
        aria-label="View"
      >
        {(["list", "sky"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => props.onViewChange(v)}
            aria-pressed={props.view === v}
            className={`rounded-pill px-3 py-1 text-caption capitalize transition-colors ${ABYSS_BTN_FOCUS} ${
              props.view === v
                ? "bg-abyss-accent text-abyss-on-accent"
                : "text-abyss-ink-muted hover:text-abyss-ink"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
