import { WIN_FACETS, facetCssVars } from "@/lib/daily-wins/facets";

type Props = {
  className?: string;
  opacity?: number;
};

/** D12/D16 — three-hue facet marks for wins empty invitations. */
export function GhostFacetStrip({ className = "", opacity = 0.55 }: Props) {
  return (
    <div
      className={`flex h-2 min-w-0 overflow-hidden rounded-full ${className}`}
      role="img"
      aria-label="Body · Mind · Soul legend"
    >
      {WIN_FACETS.map((facet) => (
        <span
          key={facet}
          className="min-w-[2px] flex-1 shadow-[0_0_0_1px_var(--mark-ring)]"
          style={{ backgroundColor: facetCssVars(facet).solid, opacity }}
        />
      ))}
    </div>
  );
}
