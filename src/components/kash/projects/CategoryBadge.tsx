import { PROJECT_CATEGORY_META, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  category: ProjectCategory;
  className?: string;
};

export default function CategoryBadge({ category, className = "" }: Props) {
  const meta = PROJECT_CATEGORY_META[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
      {meta.label}
    </span>
  );
}
