import { cn } from "@/lib/cn";
import { facetCssVars, facetLabel, type WinFacet } from "@/lib/daily-wins/facets";

type Props = {
  facet: WinFacet;
  className?: string;
};

/** D7/D16 — compact Body · Mind · Soul badge for wins surfaces. */
export function WinFacetBadge({ facet, className }: Props) {
  const vars = facetCssVars(facet);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-chip px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        className
      )}
      style={{
        backgroundColor: vars.fill,
        color: vars.text,
      }}
    >
      {facetLabel(facet)}
    </span>
  );
}
