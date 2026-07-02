import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";

type Props = {
  className?: string;
  /** Ghost tint strength (D10 ~45%, week columns ~35%). */
  opacity?: number;
  "aria-label"?: string;
};

/** Five-segment category legend at reduced opacity — pre-data chrome (D10). */
export function GhostCategoryStrip({
  className = "",
  opacity = 0.45,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <div
      className={`flex h-2 min-w-0 overflow-hidden rounded-full ${className}`}
      role="img"
      aria-label={ariaLabel ?? "Life-area balance legend"}
    >
      {PROJECT_CATEGORIES.map((category) => (
        <span
          key={category}
          className="min-w-[2px] flex-1 shadow-[0_0_0_1px_var(--mark-ring)]"
          style={{ backgroundColor: categorySolidVar(category), opacity }}
        />
      ))}
    </div>
  );
}
