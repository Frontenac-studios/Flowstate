/**
 * Smart-composer routing (W5, discovery §13 Q2). One field: if what you typed
 * takes a number, it's a bet (a Target); otherwise it's a Direction — a rule for
 * saying no (Decision 2.1). This is only the first guess: the composer reveals the
 * result inline for confirmation and lets you flip the type, so the heuristic
 * favours being obvious over being clever.
 */

export type ComposerGuess =
  | { kind: "direction"; statement: string }
  | {
      kind: "target";
      title: string;
      measureKind: "currency" | "count";
      /** Cents for `currency`; a whole number for `count`. */
      measureTarget: number;
    };

/** Parse "$40k", "$1,500", "40k" → cents. Null when there's no currency amount. */
function parseCurrencyCents(text: string): number | null {
  // The k/m multiplier must sit right on the number and not be the start of a word
  // (so "$1,500 MRR" is $1,500, not $1,500M).
  const match = text.match(/\$\s?(\d[\d,]*(?:\.\d+)?)([km])?(?![a-z])/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const scale =
    match[2]?.toLowerCase() === "k" ? 1_000 : match[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
  return Math.round(amount * scale * 100);
}

/** First standalone whole number in the text (a count target), or null. */
function parseCount(text: string): number | null {
  const match = text.match(/\b(\d[\d,]*)\b/);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Route composer text to a Direction or a Target proposal. A `$` amount reads as a
 * currency bet; any other standalone number reads as a count bet; text with no
 * number is a Direction. The caller confirms and can override the kind.
 */
export function routeComposerInput(raw: string): ComposerGuess | null {
  const text = raw.trim();
  if (!text) return null;

  const cents = parseCurrencyCents(text);
  if (cents != null) {
    return { kind: "target", title: text, measureKind: "currency", measureTarget: cents };
  }

  const count = parseCount(text);
  if (count != null) {
    return { kind: "target", title: text, measureKind: "count", measureTarget: count };
  }

  return { kind: "direction", statement: text };
}
