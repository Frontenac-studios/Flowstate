export function shouldShowMorningHandoff(input: {
  enabled: boolean;
  dismissedLocally: boolean;
  seen: boolean | undefined;
  blockedByOtherRitual?: boolean;
}): boolean {
  if (!input.enabled || input.dismissedLocally || input.blockedByOtherRitual) return false;
  return input.seen === false;
}
