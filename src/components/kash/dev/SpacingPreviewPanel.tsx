"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  type DesktopSpacingVariant,
  markSpacingPreviewActive,
  readSpacingVarValues,
  writeSpacingVariant,
} from "@/lib/desktop/spacing-variant";

const VARIANTS: { id: DesktopSpacingVariant; label: string; description: string }[] = [
  {
    id: "a",
    label: "Variant A",
    description: "48px rail · proportional spacing (reference-like)",
  },
  {
    id: "b",
    label: "Variant B",
    description: "64px rail · tightened gaps and padding",
  },
];

export function SpacingPreviewPanel() {
  const [variant, setVariant] = useState<DesktopSpacingVariant>("a");
  const [vars, setVars] = useState<Record<string, string>>({});

  const refreshVars = useCallback(() => {
    setVars(readSpacingVarValues());
  }, []);

  useEffect(() => {
    markSpacingPreviewActive();
    const stored = window.localStorage.getItem("kash-spacing-variant");
    setVariant(stored === "b" ? "b" : "a");
    refreshVars();
  }, [refreshVars]);

  const selectVariant = (next: DesktopSpacingVariant) => {
    setVariant(next);
    writeSpacingVariant(next);
    refreshVars();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-stack">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-medium text-ink">Desktop spacing preview</h1>
        <p className="text-body text-ink-muted">
          Toggle variants to compare rail-scaled spacing. Open Today or Week in another tab — the
          choice persists via localStorage.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectVariant(item.id)}
            className={`rounded-card border px-card-x py-card-y text-left transition ${
              variant === item.id
                ? "border-ink bg-[var(--surface-selected)]"
                : "border-subtle bg-surface hover:bg-surface-2"
            }`}
          >
            <span className="block text-subtitle font-medium text-ink">{item.label}</span>
            <span className="block text-meta text-ink-muted">{item.description}</span>
          </button>
        ))}
      </div>

      <section className="rounded-card border border-subtle bg-surface px-card-x py-card-y">
        <h2 className="mb-2 text-subtitle font-medium text-ink">Computed tokens</h2>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 font-mono text-meta">
          {Object.entries(vars).map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-ink-muted">{name}</dt>
              <dd className="text-ink">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/today"
          className="rounded-control border border-border bg-surface px-3 py-2 text-body text-ink transition hover:bg-surface-2"
        >
          Open Today
        </Link>
        <Link
          href="/this-week"
          className="rounded-control border border-border bg-surface px-3 py-2 text-body text-ink transition hover:bg-surface-2"
        >
          Open Week
        </Link>
      </nav>

      <aside className="rounded-card border border-dashed border-subtle px-card-x py-card-y text-meta text-ink-muted">
        <p>
          <strong className="text-ink">Shell mockup</strong> — the live app below uses real
          components. Rail width sets the scale for all spacing on desktop.
        </p>
      </aside>
    </div>
  );
}
