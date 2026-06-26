import type { PlanningHorizon } from "@/lib/planning/horizon-storage";

type Props = {
  horizon: PlanningHorizon;
};

export default function PlanHorizonPlaceholder({ horizon }: Props) {
  const copy =
    horizon === "week"
      ? "Week planning view — plan-mode rail and AI draft land in the next PR."
      : horizon === "bingo"
        ? "Your annual bingo card will live here."
        : "Nothing planned yet.";

  return (
    <div className="glass-panel p-8 text-kash-ink-muted">
      <p className="text-sm">{copy}</p>
    </div>
  );
}
