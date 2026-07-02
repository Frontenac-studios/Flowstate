"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConstraintSeverity } from "@/lib/about-me/constants";
import { type ConstraintSchedule, formatConstraintSchedule } from "@/lib/about-me/constraints";
import { cn } from "@/lib/cn";
import { useTRPC } from "@/trpc/client";

import type { ConstraintDraft } from "./ConstraintForm";

type ConstraintRowData = {
  id: string;
  type: ConstraintDraft["type"];
  label: string;
  // jsonb column surfaces as `unknown`; normalized via parseSchedule below.
  schedule: unknown;
  severity: ConstraintSeverity;
  author: "user" | "ai";
  sourceText: string | null;
  learnedAt: string | Date | null;
};

/** hard vs soft in B&W: weight/fill only, never hue (categories own colour). */
function SeverityPill({ severity }: { severity: ConstraintSeverity }) {
  return (
    <span
      className={cn(
        "rounded-pill px-2 py-0.5 text-caption",
        severity === "hard" ? "bg-ink text-accent-on" : "border border-border text-ink-muted"
      )}
    >
      {severity === "hard" ? "Hard" : "Soft"}
    </span>
  );
}

function parseSchedule(raw: unknown): ConstraintSchedule | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ConstraintSchedule;
    } catch {
      return null;
    }
  }
  return raw as ConstraintSchedule;
}

export default function ConstraintRow({
  row,
  onEdit,
}: {
  row: ConstraintRowData;
  onEdit: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const removeMutation = useMutation(
    trpc.aboutMe.constraints.remove.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.constraints.list.queryKey() }),
    })
  );

  const scheduleText = formatConstraintSchedule(parseSchedule(row.schedule));

  return (
    <div className="flex items-center gap-3 rounded-row border border-subtle bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body text-ink">{row.label}</span>
          <SeverityPill severity={row.severity} />
        </div>
        {scheduleText ? <p className="text-meta text-ink-muted">{scheduleText}</p> : null}
        {row.author === "ai" && row.sourceText ? (
          <p className="text-caption text-ink-faint">learned from {row.sourceText}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-meta text-ink-muted transition hover:text-ink"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => removeMutation.mutate({ id: row.id })}
        disabled={removeMutation.isPending}
        aria-label={`Remove ${row.label}`}
        className="text-meta text-ink-faint transition hover:text-critical disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
