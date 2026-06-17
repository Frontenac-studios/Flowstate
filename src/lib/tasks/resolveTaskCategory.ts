import { type ProjectCategory } from "../projects/categories";

// Phase 1 (1.4a, Model C — AI-forward). One shared resolver decides every loose
// task's category through a fixed ladder. The same function powers live capture
// (tRPC create/update) and offline sync; the one-time AI backfill (0.3) reuses the
// same inference, adding only a human-review gate because it is bulk.
//
//   1. explicit   — semicolon segment / chip / API value          → assignment
//   2. project    — project.category when the task has a project   → context
//   3. ai         — inferCategoryFromTitle, online AND confident   → AI-forward
//   4. lastUsed   — app_settings.last_used_category                → habit
//   5. fallback   — adulting (NOT NULL) + unresolved = true        → invisible plumbing

// 1.4d: the NOT-NULL placeholder used when nothing resolves. Stored but never shown
// as a real category — the row is flagged `unresolved` and rendered as a neutral marker.
export const DEFAULT_FALLBACK_CATEGORY: ProjectCategory = "adulting";

// 1.4c: AI must clear this confidence to outrank the user's last-used habit.
// Tunable; if the inference call cannot supply a usable confidence score this
// effectively becomes "AI always wins" (pass a threshold of 0).
export const AI_CONFIDENCE_THRESHOLD = 0.7;

export interface CategoryInference {
  category: ProjectCategory;
  /** 0..1. Compared against the threshold in layer 3. */
  confidence: number;
}

// Layer 3 inference, injected so the AI call is swappable and tests/offline paths
// can stub it. Returns null when it has no opinion.
export type InferCategoryFromTitle = (title: string) => CategoryInference | null;

export interface ResolveCategoryInput {
  /** Explicit assignment from semicolon segment / chip / API value (layer 1). */
  explicit?: ProjectCategory | null;
  /** project.category when the task has a project (layer 2). */
  projectCategory?: ProjectCategory | null;
  /** app_settings.last_used_category (layer 4 habit). */
  lastUsed?: ProjectCategory | null;
  /** Whether the AI layer is reachable. Offline (1.4e) skips layer 3 entirely. */
  online: boolean;
}

export type CategorySource = "explicit" | "project" | "ai" | "lastUsed" | "fallback";

export interface ResolvedCategory {
  category: ProjectCategory;
  /** 1.1a / 1.4d: true = invisible-plumbing placeholder, not a real categorization. */
  unresolved: boolean;
  /** Which ladder layer decided it — drives telemetry and tests. */
  source: CategorySource;
}

export function resolveTaskCategory(
  title: string,
  input: ResolveCategoryInput,
  inferCategoryFromTitle: InferCategoryFromTitle,
  threshold: number = AI_CONFIDENCE_THRESHOLD
): ResolvedCategory {
  // 1 — explicit assignment always wins.
  if (input.explicit) {
    return { category: input.explicit, unresolved: false, source: "explicit" };
  }

  // 2 — project context.
  if (input.projectCategory) {
    return { category: input.projectCategory, unresolved: false, source: "project" };
  }

  // 3 — AI inference, only when online and confident (1.4c). Offline skips this.
  if (input.online) {
    const inferred = inferCategoryFromTitle(title);
    if (inferred && inferred.confidence >= threshold) {
      return { category: inferred.category, unresolved: false, source: "ai" };
    }
  }

  // 4 — habit.
  if (input.lastUsed) {
    return { category: input.lastUsed, unresolved: false, source: "lastUsed" };
  }

  // 5 — invisible plumbing: NOT-NULL placeholder, flagged unresolved.
  return { category: DEFAULT_FALLBACK_CATEGORY, unresolved: true, source: "fallback" };
}
