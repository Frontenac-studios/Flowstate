import type { ReflectionBeatDayContext, ReflectionBeatResult } from "./reflection-beat";
import { templateReflectionBeat } from "./reflection-beat";
import type { WinProposal } from "./types";

/**
 * Mock Reflection register (DWN-4 / G-7A placeholder for unit tests).
 * Production uses `generateReflectionBeat`, which falls back to `templateReflectionBeat` when AI is off.
 */
export function mockReflectionRegisterBeat(
  baseProposals: readonly WinProposal[],
  ctx: ReflectionBeatDayContext
): ReflectionBeatResult {
  return templateReflectionBeat(baseProposals, [], ctx);
}
