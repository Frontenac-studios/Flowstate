/**
 * Normalize a goal title before saving: trim/collapse whitespace, strip
 * trailing sentence punctuation, and lowercase the first letter so titles
 * read consistently ("launch my website", not "Launch my website.").
 */
export default function normalizeGoalTitle(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  const stripped = collapsed.replace(/[.!?…;:,\s]+$/, "");
  if (stripped.length === 0) return collapsed;
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}
