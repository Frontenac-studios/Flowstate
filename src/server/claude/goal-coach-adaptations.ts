import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, chatMessages } from "@/db/tables";
import { messageContentSchema } from "@/lib/chat/message-content";
import type { GoalProposalOutcome } from "@/lib/planning/goal-coach-signal";
import { mergeEased } from "@/lib/planning/goal-coach-signal";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import {
  DEFAULT_GOAL_COACH_ADAPTATIONS,
  goalCoachAdaptationsSchema,
} from "@/lib/settings/constants";

/** How many of a coaching thread's messages to scan for proposal outcomes. */
const MAX_OUTCOME_MESSAGES = 200;

const CATEGORY_SET = new Set<string>(PROJECT_CATEGORIES);

/** Read the user's consented eased-off categories (empty when never set). */
export async function loadEasedCategories(userId: string): Promise<ProjectCategory[]> {
  const [row] = await db
    .select({ adaptations: appSettings.goalCoachAdaptations })
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);
  const parsed = goalCoachAdaptationsSchema.safeParse(row?.adaptations);
  return parsed.success ? parsed.data.eased : [...DEFAULT_GOAL_COACH_ADAPTATIONS.eased];
}

/**
 * Persist a surface-and-ask outcome: add the categories the user agreed to ease off and
 * lift any they asked to resume. Only called after explicit in-chat consent — the coach's
 * question is the confirmation step, so there is no separate confirm card.
 */
export async function applyGoalCoachingAdjustment(
  userId: string,
  input: { easeOff?: readonly ProjectCategory[]; resume?: readonly ProjectCategory[] }
): Promise<{ eased: ProjectCategory[] }> {
  const current = await loadEasedCategories(userId);
  const eased = mergeEased(current, input.easeOff ?? [], input.resume ?? []);
  await db
    .insert(appSettings)
    .values({ userId, goalCoachAdaptations: { eased } })
    .onConflictDoUpdate({
      target: appSettings.userId,
      set: { goalCoachAdaptations: { eased }, updatedAt: new Date() },
    });
  return { eased };
}

/**
 * Reduce a coaching thread's `propose_bingo_goals` messages to per-proposal outcomes
 * (status + the distinct categories each carried). Feeds the J3 category signal so the
 * coach can surface a skip pattern and ask before adapting.
 */
export async function loadGoalProposalOutcomes(
  userId: string,
  threadId: string
): Promise<GoalProposalOutcome[]> {
  const rows = await db
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.threadId, threadId),
        eq(chatMessages.role, "assistant")
      )
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(MAX_OUTCOME_MESSAGES);

  const outcomes: GoalProposalOutcome[] = [];
  for (const row of rows) {
    const parsed = messageContentSchema.safeParse(row.content);
    const proposal = parsed.success ? parsed.data.meta?.proposal : undefined;
    if (!proposal || proposal.kind !== "propose_bingo_goals") continue;
    const categories = Array.from(
      new Set(
        proposal.items
          .map((item) => item.category)
          .filter((c): c is ProjectCategory => c != null && CATEGORY_SET.has(c))
      )
    );
    outcomes.push({ status: proposal.status, categories });
  }
  return outcomes;
}
