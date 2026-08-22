import type { SlippedTop3Task } from "./evaluate-top3-stall";

/** Amber slip chip copy (TD3 / T3). */
export function templateTop3SlipMessage(task: SlippedTop3Task): string {
  return `'${task.title}' keeps sliding. Break it down, or let it go?`;
}
