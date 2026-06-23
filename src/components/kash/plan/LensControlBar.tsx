"use client";

import type { ReactNode } from "react";

import { lensFilterOptions } from "@/lib/tasks/lens-apply";
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
 * Lens control bar (VF-2 + VF-3): independent reveal toggles (top pill), plus —
 * once a lens is active — a single-select group/color control and stackable
 * value-filter chips per lens. Toggles mirror the c/p/r/d keystrokes; the 2-lens
 * cap (VF3) means a 3rd reveal unpresses the oldest.
 */
export function LensControlBar() {
  const lens = useLens();
  if (!lens) return null;

  const { state } = lens;
  // VF-3 group/filter controls only render where they apply (This Week). Today
  // stays pure VF-2 reveal toggles until VF-4 rolls application out per page.
  const showApplyControls = lens.scope === "this-week" && state.active.length > 0;

  return (
    <div className="flex flex-col gap-2">
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

      {showApplyControls ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <div
            className="glass-pill flex items-center gap-1"
            role="group"
            aria-label="Group tasks by"
          >
            <span className="px-1.5 text-kash-ink-muted">Group</span>
            <GroupChip
              label="None"
              active={state.group === null}
              onClick={() => lens.setGroup(null)}
            />
            {state.active.map((prop) => (
              <GroupChip
                key={prop}
                label={LENS_META[prop].label}
                active={state.group === prop}
                onClick={() => lens.setGroup(prop)}
              />
            ))}
          </div>

          {state.active.map((prop) => {
            const options = lensFilterOptions(prop);
            if (options.length === 0) return null;
            const selected = state.filters[prop] ?? [];
            return (
              <div
                key={prop}
                className="flex flex-wrap items-center gap-1"
                role="group"
                aria-label={`Filter by ${LENS_META[prop].label}`}
              >
                <span className="text-kash-ink-muted">{LENS_META[prop].label}:</span>
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => lens.toggleFilter(prop, opt.value)}
                    aria-pressed={selected.includes(opt.value)}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 transition ${
                      selected.includes(opt.value)
                        ? "border-kash-accent bg-kash-accent text-white"
                        : "border-white/30 text-kash-ink-muted hover:text-kash-ink"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function GroupChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 transition ${
        active ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
      }`}
    >
      {label}
    </button>
  );
}
