/**
 * Guess which client a project belongs to from the name the user is typing.
 *
 * Creation is one line (Kash 3.2): the user types "Great White Q4 reporting" and the
 * client chip for Great White lights up on its own. The guess is a suggestion the
 * user can override, never a silent assignment — NewProjectForm renders the matched
 * chip as selected, so what will be saved is visible before Enter.
 *
 * Matching is deliberately dumb. A client name appearing as a whole-word run inside
 * the project name is the only signal we trust; fuzzy scoring produces confident
 * wrong answers on a five-client list, and a wrong client is worse than none here
 * because it silently sets the category too.
 */

export type ClientMatchCandidate = {
  id: string;
  name: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The longest client name appearing as a whole-word run inside `projectName`, or
 * null. Longest wins so "Great White Group" beats "Great White" when both exist.
 */
export function matchClientFromName(
  projectName: string,
  candidates: ReadonlyArray<ClientMatchCandidate>
): ClientMatchCandidate | null {
  const haystack = normalize(projectName);
  if (haystack.length === 0) return null;

  let best: ClientMatchCandidate | null = null;
  let bestLength = 0;

  for (const candidate of candidates) {
    const needle = normalize(candidate.name);
    if (needle.length === 0) continue;
    // Pad both sides so "hume" does not match "humextra".
    if (!` ${haystack} `.includes(` ${needle} `)) continue;
    if (needle.length > bestLength) {
      best = candidate;
      bestLength = needle.length;
    }
  }

  return best;
}
