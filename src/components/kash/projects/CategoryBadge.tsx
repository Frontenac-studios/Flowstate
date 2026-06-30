import { PROJECT_CATEGORY_META, type ProjectCategory } from "@/lib/projects/categories";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";

type Props = {
  category: ProjectCategory;
  className?: string;
};

export default function CategoryBadge({ category, className = "" }: Props) {
  const meta = PROJECT_CATEGORY_META[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: categoryFillVar(category), color: categoryTextVar(category) }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: categorySolidVar(category) }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}
