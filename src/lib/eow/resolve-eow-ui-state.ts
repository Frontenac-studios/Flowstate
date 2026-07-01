import type { EowUiState } from "./types";

export type ResolveEowUiInput = {
  pathname: string;
  reviewDue: boolean;
  dismissedForWeek: boolean;
  skippedForWeek: boolean;
  snoozed: boolean;
  /** First paint on /this-week after week wind-down without chip dismissed yet */
  initialVisitAfterDue: boolean;
  /** User crossed week wind-down while already on /this-week this session */
  crossedThresholdOnPage: boolean;
};

export function resolveEowUiState(input: ResolveEowUiInput): EowUiState {
  // The weekly review never auto-opens (Week §7.6 — mirrors Today §6 EoD). A
  // soft chip only; opening the review is always an explicit user action.
  if (input.pathname !== "/this-week") return "hidden";
  if (!input.reviewDue) return "hidden";
  if (input.dismissedForWeek || input.skippedForWeek || input.snoozed) return "hidden";

  if (input.initialVisitAfterDue || input.crossedThresholdOnPage) {
    return "chip";
  }

  return "hidden";
}
