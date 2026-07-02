export function shouldShowMorningHandoff(input: {
  enabled: boolean;
  dismissedLocally: boolean;
  seen: boolean | undefined;
}): boolean {
  if (!input.enabled || input.dismissedLocally) return false;
  return input.seen === false;
}
