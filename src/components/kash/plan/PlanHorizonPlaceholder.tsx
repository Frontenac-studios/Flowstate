import type { PlanningHorizon } from "@/lib/planning/horizon-storage";

type Props = {
  horizon: PlanningHorizon;
};

export default function PlanHorizonPlaceholder({ horizon }: Props) {
  const copy =
    horizon === "week"
      ? "Week planning view — plan-mode rail and AI draft land in the next PR."
      : horizon === "goals"
        ? "Your goals — bingo grid or list overview."
        : "Nothing planned yet.";

  return (
    <div className="rounded-card border border-subtle bg-surface p-8 text-ink-muted shadow-surface">
      <p className="text-sm">{copy}</p>
    </div>
  );
}
