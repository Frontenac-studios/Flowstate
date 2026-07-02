/** D27 — List + Themes render light; Sky renders dark. View carries the theme. */
export type AbyssSurfaceVariant = "light" | "dark";

export type AbyssViewMode = "list" | "themes" | "sky";

export function surfaceVariantForView(view: AbyssViewMode): AbyssSurfaceVariant {
  return view === "sky" ? "dark" : "light";
}
