"use client";

import type { AboutMeSection, ConstraintSeverity } from "@/lib/about-me/constants";
import { type ConstraintSchedule, formatConstraintSchedule } from "@/lib/about-me/constraints";
import { cn } from "@/lib/cn";

export type Suggestion = {
  id: string;
  targetSection: AboutMeSection;
  payload: unknown;
  sourceText: string | null;
  learnedAt: string | Date | null;
};

function provenanceLine(sourceText: string | null, learnedAt: string | Date | null): string {
  const parts = ["Kash noticed"];
  if (sourceText) parts.push(sourceText);
  if (learnedAt) {
    const d = typeof learnedAt === "string" ? new Date(learnedAt) : learnedAt;
    if (!Number.isNaN(d.getTime())) parts.push(d.toLocaleString("en", { month: "short" }));
  }
  return parts.join(" · ");
}

function GhostBody({ section, payload }: { section: AboutMeSection; payload: unknown }) {
  const p = (payload ?? {}) as Record<string, unknown>;

  if (section === "values") {
    return (
      <span className="inline-flex rounded-chip border border-dashed border-ink-faint px-3 py-1 text-body text-ink-muted">
        {String(p.label ?? "")}
      </span>
    );
  }

  if (section === "constraints") {
    const scheduleText = formatConstraintSchedule(p.schedule as ConstraintSchedule | null);
    return (
      <div className="flex items-center gap-2">
        <span className="text-body text-ink-muted">{String(p.label ?? "")}</span>
        <span className="rounded-pill border border-dashed border-ink-faint px-2 py-0.5 text-caption capitalize text-ink-faint">
          {String((p.severity as ConstraintSeverity) ?? "soft")}
        </span>
        {scheduleText ? <span className="text-meta text-ink-faint">{scheduleText}</span> : null}
      </div>
    );
  }

  return <p className="text-body italic text-ink-muted">“{String(p.text ?? "")}”</p>;
}

export default function SuggestionGhost({
  suggestion,
  onAccept,
  onDismiss,
  busy,
}: {
  suggestion: Suggestion;
  onAccept: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  return (
    <div className={cn("rounded-row border border-dashed border-ink-faint bg-surface-2 p-3")}>
      <p className="mb-2 text-caption text-ink-muted">
        {provenanceLine(suggestion.sourceText, suggestion.learnedAt)}
      </p>
      <div className="mb-3">
        <GhostBody section={suggestion.targetSection} payload={suggestion.payload} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="rounded-control border-emphasis border-ink px-3 py-1 text-meta text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
        >
          Add to doc
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="rounded-control border border-border px-3 py-1 text-meta text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
