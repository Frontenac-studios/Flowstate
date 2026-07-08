"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { type LensProperty } from "@/lib/tasks/lens";

import { LENS_KEY_BINDINGS, useLens } from "./LensProvider";

/** The single key bound to each lens, for the chip's hint + a11y label. */
const KEY_FOR_PROPERTY: Record<LensProperty, string> = Object.fromEntries(
  Object.entries(LENS_KEY_BINDINGS).map(([key, prop]) => [prop, key.toUpperCase()])
) as Record<LensProperty, string>;

type LensMeta = { label: string; emblem: ReactNode };

/** A compact emblem per channel, echoing the row indicator it reveals (VF4). */
const LENS_META: Record<LensProperty, LensMeta> = {
  category: {
    label: "Category",
    emblem: <span className="h-3 w-[var(--stripe-width)] rounded-full bg-current" />,
  },
  priority: {
    label: "Priority",
    emblem: (
      <span className="flex items-center gap-[2px]">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    ),
  },
  project: {
    label: "Project",
    emblem: <span className="h-2 w-2 rounded-full bg-current" />,
  },
  due: {
    label: "Due",
    emblem: <span className="h-2.5 w-2.5 rounded-full border-emphasis border-current" />,
  },
};

type Props = {
  /**
   * D11/V3: when true, hide the full bar behind a filter icon until the list is
   * worth filtering (or the user expands it). Active lenses always force open.
   */
  collapseUntilUseful?: boolean;
};

/**
 * Lens control bar (VF-2): independent reveal toggles that surface the matching
 * row indicator (category stripe, priority dots, project dot, due) per active
 * lens. Toggles mirror the c/p/r/d keystrokes; the 2-lens cap (VF3) means a 3rd
 * reveal unpresses the oldest. Reveal is a purely visual distinction — it never
 * groups or hides tasks.
 */
export function LensControlBar({ collapseUntilUseful = false }: Props) {
  const lens = useLens();
  const [expanded, setExpanded] = useState(false);
  if (!lens) return null;

  const { state } = lens;
  const hasActiveLens = state.active.length > 0;
  const showCollapsed = collapseUntilUseful && !expanded && !hasActiveLens;

  if (showCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        aria-expanded={false}
        aria-label="Show filters"
        title="Filters"
      >
        <span aria-hidden className="flex w-3 items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full border-emphasis border-current" />
        </span>
        Filter
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-1 rounded-pill border border-border bg-surface text-sm"
        role="group"
        aria-label="Lenses"
      >
        {lens.properties.map((prop) => {
          const meta = LENS_META[prop];
          const key = KEY_FOR_PROPERTY[prop];
          const active = lens.reveal[prop] === true;
          return (
            <button
              key={prop}
              type="button"
              onClick={() => lens.toggle(prop)}
              aria-pressed={active}
              title={`${meta.label} lens — press ${key}`}
              aria-label={`${meta.label} lens (${key})`}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition focus:outline-none ${
                active
                  ? "kash-focus-visible bg-active-surface text-ink outline-none"
                  : "kash-focus-visible text-ink-muted outline-none hover:text-ink"
              }`}
            >
              <span aria-hidden className="flex w-3 items-center justify-center">
                {meta.emblem}
              </span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
