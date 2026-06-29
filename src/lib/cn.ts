/**
 * Minimal className joiner — concatenates truthy class strings. Deliberately
 * does NOT resolve conflicting Tailwind utilities (no tailwind-merge dependency,
 * per the "boring solutions" rule). Components that accept a `className` should
 * avoid baking utilities a caller commonly overrides (e.g. font-size); pass the
 * caller's `className` LAST so it wins on source order where it can.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
