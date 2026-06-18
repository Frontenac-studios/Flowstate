import { type ProjectCategory } from "@/lib/projects/categories";
import { type ParseResult } from "@/lib/parser/parse-quick-input";
import {
  type CategoryInference,
  resolveTaskCategory,
  type ResolvedCategory,
} from "@/lib/tasks/resolveTaskCategory";

export type CategoryProjectRef = { slug: string; category: ProjectCategory };

// 1.4b composer accent bar: the category a parsed line will land on, computed
// client-side. The optional `aiInference` is the live embeddings guess (1H), already
// gated by the classifier and fed in by the composer's debounced inference hook. When
// it's null the AI layer is skipped (`online: false`) and the preview degrades honestly
// to explicit > project > last-used; when present, layer 3 lets a confident guess
// outrank last-used (Model C). `unresolved: true` drives the neutral marker (1.4d).
export function previewLineCategory(
  parse: Pick<ParseResult, "title" | "category" | "projectSlug">,
  projects: CategoryProjectRef[],
  lastUsed: ProjectCategory | null,
  aiInference: CategoryInference | null = null
): ResolvedCategory {
  const projectCategory = parse.projectSlug
    ? (projects.find((p) => p.slug.toLowerCase() === parse.projectSlug!.toLowerCase())?.category ??
      null)
    : null;

  return resolveTaskCategory(
    parse.title,
    { explicit: parse.category, projectCategory, lastUsed, online: aiInference !== null },
    () => aiInference
  );
}
