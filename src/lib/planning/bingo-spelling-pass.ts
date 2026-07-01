/** Lightweight pre-finalize spelling pass (GP3) — client-side suggestions, no AI required. */

export type SpellingFixSuggestion = {
  goalId: string;
  currentTitle: string;
  suggestedTitle: string;
};

const COMMON_FIXES: readonly [RegExp, string][] = [
  [/\bteh\b/gi, "the"],
  [/\brecieve\b/gi, "receive"],
  [/\boccured\b/gi, "occurred"],
  [/\bdefinately\b/gi, "definitely"],
  [/\bseperate\b/gi, "separate"],
];

function titleCaseWords(title: string): string {
  return title.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Propose ghosted title fixes for goals before finalize. */
export function suggestSpellingFixes(
  goals: readonly { id: string; title: string }[]
): SpellingFixSuggestion[] {
  const out: SpellingFixSuggestion[] = [];
  for (const goal of goals) {
    let suggested = goal.title.trim().replace(/\s+/g, " ");
    if (suggested !== goal.title) {
      out.push({ goalId: goal.id, currentTitle: goal.title, suggestedTitle: suggested });
      continue;
    }
    if (goal.title === goal.title.toUpperCase() && goal.title.length > 3) {
      suggested = titleCaseWords(goal.title);
      if (suggested !== goal.title) {
        out.push({ goalId: goal.id, currentTitle: goal.title, suggestedTitle: suggested });
        continue;
      }
    }
    for (const [pattern, replacement] of COMMON_FIXES) {
      if (pattern.test(goal.title)) {
        suggested = goal.title.replace(pattern, replacement);
        if (suggested !== goal.title) {
          out.push({ goalId: goal.id, currentTitle: goal.title, suggestedTitle: suggested });
          break;
        }
      }
    }
  }
  return out;
}
