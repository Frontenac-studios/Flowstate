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
  // The review modal opens ONLY on an explicit user action (Today §6 Q3-D — a
  // soft, dismissible nudge that never seizes the screen). It never auto-opens
  // on crossing the wind-down hour.
  if (input.modalOpen) return "modal";
  if (input.pathname !== "/today") return "hidden";
  if (!input.reviewDue) return "hidden";
  if (input.skippedForToday || input.snoozed) return "hidden";

  // Past wind-down, on /today, not dismissed → a gentle banner (whether the
  // review is already saved, this is the first visit after wind-down, or the
  // user crossed wind-down while here). Review stays one tap away either way.
  if (input.savedReviewExists || input.initialPlanVisitAfterDue || input.crossedThresholdOnPage) {
    return "banner";
  }

  return "hidden";
}
