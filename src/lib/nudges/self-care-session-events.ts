export const SELF_CARE_START_WALK = "self-care:start-walk";
export const SELF_CARE_START_BREATHE = "self-care:start-breathe";

export function dispatchSelfCareWalkStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SELF_CARE_START_WALK));
}

export function dispatchSelfCareBreatheStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SELF_CARE_START_BREATHE));
}
