"use client";

import type { ReactNode } from "react";

import { LENS_PROPERTIES, type LensProperty } from "@/lib/tasks/lens";

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
    emblem: <span className="h-3 w-[3px] rounded-full bg-current" />,
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
    emblem: <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-current" />,
  },
};

/**
 * VF-2 lens control bar: one independent toggle per property (not mutually
 * exclusive). Reflects the active lenses and the 2-lens cap — toggling a 3rd
 * simply unpresses the oldest. Mirrors the c/p/r/d keystrokes.
 */
export function LensControlBar() {
  const lens = useLens();
  if (!lens) return null;

  return (
    <div className="glass-pill flex items-center gap-1 text-sm" role="group" aria-label="Lenses">
      {LENS_PROPERTIES.map((prop) => {
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
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
              active ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
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
  );
}
