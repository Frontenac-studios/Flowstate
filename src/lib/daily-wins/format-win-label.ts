import type { DailyWinSource } from "./types";

type WinLabelInput = {
  label: string | null;
  source: DailyWinSource;
};

/** Display label for a stored win row (manual label or warm fallback). */
export function formatWinLabel(win: WinLabelInput, resolvedRefLabel?: string | null): string {
  const trimmed = win.label?.trim();
  if (trimmed) return trimmed;

  const resolved = resolvedRefLabel?.trim();
  if (resolved) return resolved;

  if (win.source === "manual") return "A good moment";
  return "Something that counted";
}
