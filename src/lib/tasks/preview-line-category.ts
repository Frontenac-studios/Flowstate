import { type ProjectCategory } from "@/lib/projects/categories";
import { type ParseResult } from "@/lib/parser/parse-quick-input";
import { resolveTaskCategory, type ResolvedCategory } from "@/lib/tasks/resolveTaskCategory";

export type CategoryProjectRef = { slug: string; category: ProjectCategory };

// 1.4b composer accent bar: the category a parsed line will land on, computed
// client-side. Runs the shared resolver with `online: false` so the AI layer is
// skipped — which matches the server today (inference abstains) and degrades
// honestly: the preview shows explicit > project > last-used, never a guess the
// client can't actually make. `unresolved: true` drives the neutral marker.
export function previewLineCategory(
  parse: Pick<ParseResult, "title" | "category" | "projectSlug">,
  projects: CategoryProjectRef[],
  lastUsed: ProjectCategory | null
): ResolvedCategory {
  const projectCategory = parse.projectSlug
    ? (projects.find((p) => p.slug.toLowerCase() === parse.projectSlug!.toLowerCase())?.category ??
      null)
    : null;

  return resolveTaskCategory(
    parse.title,
    { explicit: parse.category, projectCategory, lastUsed, online: false },
    () => null
  );
}
