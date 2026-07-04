/**
 * V8 first-run gate. Onboarding runs once per client until completed; it takes
 * priority over the daily morning hand-off so a fresh user isn't double-sheeted.
 *
 * `eligible` is resolved once from the empty-day seed check (existing users with
 * tasks are marked complete and never enter the flow).
 */
export function shouldShowOnboarding(input: {
  completed: boolean;
  /** null = still resolving whether this client is a fresh empty day. */
  eligible: boolean | null;
  /** When true, another blocking ritual (e.g. Monday entry) owns the surface. */
  blockedByOtherRitual?: boolean;
}): boolean {
  if (input.completed) return false;
  if (input.blockedByOtherRitual) return false;
  return input.eligible === true;
}
