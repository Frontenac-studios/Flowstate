"use client";

import { useQuery } from "@tanstack/react-query";

import { evaluateOffTarget } from "@/lib/budget/off-target";
import { useTRPC } from "@/trpc/client";

/**
 * W14 — the off-target banner (goal 6). Silent by default; a single reflective
 * question appears only when the week's logged time drifts from the declared tilt
 * past the threshold. Reserved-yellow (a status colour, never a category), never
 * crimson — it asks, it does not alarm.
 */
export function OffTargetBanner({ tzOffsetMinutes }: { tzOffsetMinutes: number }) {
  const trpc = useTRPC();
  const { data: bar } = useQuery(trpc.budget.thisWeek.queryOptions({ tzOffsetMinutes }));
  if (!bar) return null;

  const off = evaluateOffTarget(bar);
  if (!off) return null;

  const question = off.towardPersonal
    ? `More personal than planned this week — ${off.actualBusinessPct}% business against your ${off.tiltBusinessPct}% tilt. Is that the week you meant to have?`
    : `More business than planned this week — ${off.actualBusinessPct}% against your ${off.tiltBusinessPct}% tilt. Room left for the rest of life?`;

  return (
    <div
      role="note"
      className="rounded-card border px-4 py-3 text-sm"
      style={{
        backgroundColor: "var(--reserved-yellow-fill)",
        borderColor: "var(--reserved-yellow-solid)",
        color: "var(--reserved-yellow-text)",
      }}
    >
      {question}
    </div>
  );
}
