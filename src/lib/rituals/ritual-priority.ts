/**
 * Ritual overlay priority on Today / Week surfaces (highest blocks lower).
 *
 * 1. Onboarding — blocks Monday entry and morning hand-off
 * 2. Monday entry — blocks morning hand-off
 * 3. Morning hand-off
 */
export function isMorningHandoffBlocked(input: {
  mondayBlocked: boolean;
  onboardingActive?: boolean;
}): boolean {
  if (input.onboardingActive) return true;
  if (input.mondayBlocked) return true;
  return false;
}
