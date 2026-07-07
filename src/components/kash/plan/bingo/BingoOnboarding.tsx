"use client";

import { useState } from "react";

import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";

type Props = {
  year: number;
  busy: boolean;
  onBrainDump: (lines: { title: string; category: ProjectCategory }[]) => void;
  onBlank: () => void;
  onGuidedComplete: () => void;
};

/** First-run bingo onboarding — three equal options (ON-1). */
export default function BingoOnboarding({
  year,
  busy,
  onBrainDump,
  onBlank,
  onGuidedComplete,
}: Props) {
  const [mode, setMode] = useState<"pick" | "brain-dump" | "guided">("pick");
  const [brainDumpText, setBrainDumpText] = useState("");
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [guidedTitle, setGuidedTitle] = useState("");

  if (mode === "pick") {
    return (
      <div className="flex flex-col gap-4 rounded-card border border-subtle bg-surface p-8 shadow-surface">
        <h2 className="text-body font-semibold text-ink">Your {year} bingo card</h2>
        <p className="text-body text-ink-muted">
          A 5×5 grid of goals — line up five done squares for a win. How would you like to start?
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("brain-dump")}
            className="flex flex-col gap-1 rounded-card border border-subtle bg-surface p-4 text-left transition hover:border-ink-muted hover:bg-surface-2 disabled:opacity-40"
          >
            <span className="text-body font-medium text-ink">AI brain-dump</span>
            <span className="text-caption text-ink-muted">
              Paste a prose list — we&apos;ll draft category-tagged goals.
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onBlank}
            className="flex flex-col gap-1 rounded-card border border-subtle bg-surface p-4 text-left transition hover:border-ink-muted hover:bg-surface-2 disabled:opacity-40"
          >
            <span className="text-body font-medium text-ink">Blank card</span>
            <span className="text-caption text-ink-muted">
              Start with an empty grid and fill squares yourself.
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("guided")}
            className="flex flex-col gap-1 rounded-card border border-subtle bg-surface p-4 text-left transition hover:border-ink-muted hover:bg-surface-2 disabled:opacity-40"
          >
            <span className="text-body font-medium text-ink">Guided setup</span>
            <span className="text-caption text-ink-muted">
              Walk through each life area one goal at a time.
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "brain-dump") {
    const parseLines = () => {
      const lines = brainDumpText
        .split(/\n|[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const parsed = lines.map((title, i) => ({
        title,
        category: PROJECT_CATEGORIES[i % PROJECT_CATEGORIES.length] as ProjectCategory,
      }));
      onBrainDump(parsed);
    };

    return (
      <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-6 shadow-surface">
        <h2 className="text-body font-semibold text-ink">Brain-dump your goals</h2>
        <p className="text-caption text-ink-muted">
          One goal per line — we&apos;ll tag categories in rotation until AI persona ships (§11).
        </p>
        <textarea
          className="min-h-[120px] rounded-control border border-subtle bg-surface px-3 py-2 text-body text-ink outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
          value={brainDumpText}
          onChange={(e) => setBrainDumpText(e.target.value)}
          placeholder="Run a half marathon&#10;Learn to cook three new cuisines&#10;..."
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !brainDumpText.trim()}
            onClick={parseLines}
            className="rounded-control border-[1.5px] border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
          >
            {busy ? "Creating…" : "Draft goals"}
          </button>
          <button
            type="button"
            onClick={() => setMode("pick")}
            className="rounded-control px-3 py-1.5 text-caption text-ink-muted hover:text-ink"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const category = PROJECT_CATEGORIES[guidedIndex] as ProjectCategory;
  const isLast = guidedIndex >= PROJECT_CATEGORIES.length - 1;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-6 shadow-surface">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: categorySolidVar(category) }}
          aria-hidden
        />
        <h2 className="text-body font-semibold text-ink">
          {categorySeedLabel(category)} · goal {guidedIndex + 1} of {PROJECT_CATEGORIES.length}
        </h2>
      </div>
      <input
        className="rounded-control border border-subtle bg-surface px-3 py-2 text-body text-ink outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        value={guidedTitle}
        onChange={(e) => setGuidedTitle(e.target.value)}
        placeholder={`One ${categorySeedLabel(category).toLowerCase()} goal…`}
        maxLength={500}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !guidedTitle.trim()}
          onClick={() => {
            onBrainDump([{ title: guidedTitle.trim(), category }]);
            setGuidedTitle("");
            if (isLast) {
              onGuidedComplete();
              setMode("pick");
            } else {
              setGuidedIndex((i) => i + 1);
            }
          }}
          className="rounded-control border-[1.5px] border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
        >
          {busy ? "Saving…" : isLast ? "Finish guided setup" : "Next area"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("pick");
            setGuidedIndex(0);
          }}
          className="rounded-control px-3 py-1.5 text-caption text-ink-muted hover:text-ink"
        >
          Back
        </button>
      </div>
    </div>
  );
}
