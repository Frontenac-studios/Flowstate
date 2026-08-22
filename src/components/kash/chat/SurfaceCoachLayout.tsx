import PlanCoachDock from "@/components/kash/plan/PlanCoachDock";
import { FLAGS } from "@/lib/flags";
import { COACH_SURFACE_CONFIG } from "@/lib/chat/coach-surfaces";
import { coachThreadId, type CoachDockSurface } from "@/lib/chat/threads";

type Props = {
  /** Which page's coach register, thread, and copy this dock runs. */
  surface: CoachDockSurface;
  /**
   * "flow" (default) lets the page scroll under a sticky dock — for natural-height
   * pages (Projects, Backlog, Care, Review). "fill" keeps the row viewport-height so
   * pages that own their internal scroll (Today, Week) stay height-constrained beside
   * a full-height dock.
   */
  variant?: "flow" | "fill";
  children: React.ReactNode;
};

/**
 * Pins a per-page coach dock to the right of the page content at `lg`, mirroring the
 * Plan pages. Below `lg` the dock stacks under the content. Wrap a page's content in
 * this to give it the same permanently-visible coach the planning surfaces carry.
 */
export function SurfaceCoachLayout({ surface, variant = "flow", children }: Props) {
  // Chat parked (docs/v1-scope.md §3.2): the dock column disappears entirely
  // rather than rendering empty, so pages get their full width back.
  if (!FLAGS.chat) return <>{children}</>;

  const isFill = variant === "fill";
  const containerClass = isFill
    ? "flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch"
    : "flex flex-col gap-4 lg:flex-row lg:items-start";
  const contentClass = isFill
    ? "flex min-h-0 min-w-0 flex-1 flex-col"
    : "flex min-w-0 flex-1 flex-col";

  return (
    <div className={containerClass}>
      <div className={contentClass}>{children}</div>
      <PlanCoachDock
        threadId={coachThreadId(surface)}
        surface={surface}
        heightMode={isFill ? "fill" : "sticky"}
        {...COACH_SURFACE_CONFIG[surface]}
      />
    </div>
  );
}
