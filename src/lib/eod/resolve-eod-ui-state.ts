import type { EodUiState } from "./types";

export type ResolveEodUiInput = {
  pathname: string;
  reviewDue: boolean;
  savedReviewExists: boolean;
  modalOpen: boolean;
  skippedForToday: boolean;
  snoozed: boolean;
  modalShownForDate: string | null;
  localDate: string;
  /** First paint on /today after 6pm without modal shown yet this session */
  initialPlanVisitAfterDue: boolean;
  /** User crossed 6pm while already on /today this session */
  crossedThresholdOnPage: boolean;
};

export function resolveEodUiState(input: ResolveEodUiInput): EodUiState {
  if (input.modalOpen) return "modal";
  if (input.pathname !== "/today") return "hidden";
  if (!input.reviewDue) return "hidden";
  if (input.skippedForToday || input.snoozed) return "hidden";

  if (input.crossedThresholdOnPage && input.modalShownForDate !== input.localDate) {
    return "modal";
  }

  if (input.savedReviewExists && input.reviewDue) {
    return "banner";
  }

  if (input.initialPlanVisitAfterDue && input.modalShownForDate !== input.localDate) {
    return "banner";
  }

  return "hidden";
}
