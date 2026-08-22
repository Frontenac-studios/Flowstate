/**
 * Plan surface — placeholder.
 *
 * The horizon planner (Goals bingo card, Year / Quarter / Month views, and the
 * ghosted planning suggestions that fed them) was removed with the bingo layer.
 * A later PR rebuilds this route as the Quarter surface described in MISSION.md.
 */
export default function PlanningPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-ink">Plan</h1>
      <div className="rounded-card border border-subtle bg-surface p-8 text-ink-muted shadow-surface">
        <p className="text-sm">The Quarter surface is being rebuilt.</p>
      </div>
    </div>
  );
}
