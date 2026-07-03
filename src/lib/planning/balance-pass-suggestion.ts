import type { AbyssBalanceCandidate } from "./abyss-balance-candidates";

export type BalancePassSuggestionSource = "abyss" | "generated";

export type BalancePassSuggestion = {
  taskTitle: string;
  taskId: string | null;
  source: BalancePassSuggestionSource;
};

/** Prefer a Backlog resurface candidate; fall back to a generated small-win title (W4 / PM6-1). */
export function resolveBalancePassSuggestion(
  abyss: AbyssBalanceCandidate | undefined,
  categoryLabel: string
): BalancePassSuggestion {
  if (abyss) {
    return {
      taskTitle: abyss.title,
      taskId: abyss.taskId,
      source: "abyss",
    };
  }

  return {
    taskTitle: `Small win for ${categoryLabel}`,
    taskId: null,
    source: "generated",
  };
}
