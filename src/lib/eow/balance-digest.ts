import { categorySeedLabel } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import type { AbyssBalanceCandidate } from "@/lib/planning/abyss-balance-candidates";

export type BalanceDigestRow = {
  category: ProjectCategory;
  label: string;
  offerTitle: string | null;
};

export function buildBalanceDigestRows(
  starvedCategories: ProjectCategory[],
  candidates: AbyssBalanceCandidate[]
): BalanceDigestRow[] {
  const byCategory = new Map(candidates.map((c) => [c.category, c]));
  return starvedCategories.map((category) => {
    const candidate = byCategory.get(category);
    return {
      category,
      label: categorySeedLabel(category),
      offerTitle: candidate?.title ?? null,
    };
  });
}

export function templateBalanceDigest(rows: BalanceDigestRow[]): string {
  if (rows.length === 0) return "";
  const names = rows.map((r) => r.label.toLowerCase());
  const joined =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `These got light this week: ${joined}.`;
}
