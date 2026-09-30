"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ChevronLeft, ChevronRight, type LucideIcon } from "@/components/kash/ui/icon";

const STORAGE_KEY = "kash.project.railCollapsed";

export type RailSection = {
  key: string;
  label: string;
  /** Shown on the collapsed strip. */
  icon: LucideIcon;
  content: ReactNode;
};

/** Label-caps heading + content, straight on the page background (RailA, no card). */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-micro font-semibold uppercase tracking-caps text-ink-muted">{label}</h2>
      {children}
    </section>
  );
}

/**
 * The project page's right rail (Spec v4 RailA): 280px of per-tab controls sitting on
 * the page background, collapsible to a thin strip of section icons. The collapsed
 * state is remembered across projects.
 */
export default function ProjectRail({ sections }: { sections: RailSection[] }) {
  const [collapsed, setCollapsed] = useState(false);

  // Adopt the saved preference after mount (no hydration mismatch).
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        if (next) window.localStorage.setItem(STORAGE_KEY, "1");
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* private mode */
      }
      return next;
    });
  }

  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand panel" : "Collapse panel"}
      title={collapsed ? "Expand panel" : "Collapse panel"}
      className="kash-focus-visible flex size-7 shrink-0 items-center justify-center rounded-pill bg-border text-ink-muted outline-none transition-colors hover:bg-tint-pressed hover:text-ink"
    >
      {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );

  if (collapsed) {
    return (
      <aside aria-label="Project panel" className="flex w-10 shrink-0 flex-col items-center gap-3">
        {toggleButton}
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={toggle}
            aria-label={label}
            title={label}
            className="kash-focus-visible flex size-8 items-center justify-center rounded-row text-ink-muted outline-none transition-colors hover:bg-tint-hover hover:text-ink"
          >
            <Icon size={16} />
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside aria-label="Project panel" className="flex w-[280px] shrink-0 flex-col gap-4">
      <div className="-mb-1 flex justify-end">{toggleButton}</div>
      {sections.map((s) => (
        <Section key={s.key} label={s.label}>
          {s.content}
        </Section>
      ))}
    </aside>
  );
}
