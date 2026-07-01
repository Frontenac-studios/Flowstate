import { z } from "zod";

import { DAILY_WIN_AUTHORS, DAILY_WIN_SOURCES, DAILY_WIN_STATES } from "@/db/schema/daily-wins";

export const dailyWinSourceSchema = z.enum(DAILY_WIN_SOURCES);
export const dailyWinStateSchema = z.enum(DAILY_WIN_STATES);
export const dailyWinAuthorSchema = z.enum(DAILY_WIN_AUTHORS);

export type DailyWinSource = z.infer<typeof dailyWinSourceSchema>;
export type DailyWinState = z.infer<typeof dailyWinStateSchema>;
export type DailyWinAuthor = z.infer<typeof dailyWinAuthorSchema>;

/** DW-2 ranking tiers (lower number = higher priority). */
export const WIN_PROPOSAL_TIERS = {
  top3Done: 1,
  priorityEffortDone: 2,
  careEvent: 3,
  goalMilestone: 4,
  abyssAction: 5,
} as const;

export type WinProposalTier = (typeof WIN_PROPOSAL_TIERS)[keyof typeof WIN_PROPOSAL_TIERS];

export type WinCandidate = {
  source: DailyWinSource;
  refId: string;
  label: string;
  tier: WinProposalTier;
  occurredAt: Date;
  priority?: number;
  effortMinutes?: number | null;
  top3Order?: number | null;
};

export type WinProposal = {
  source: DailyWinSource;
  refId: string;
  label: string;
  tier: WinProposalTier;
  occurredAt: Date;
};

export const MAX_WIN_PROPOSALS = 3;
export const HERO_WIN_SLOTS = [0, 1, 2] as const;
export type HeroWinSlot = (typeof HERO_WIN_SLOTS)[number];
