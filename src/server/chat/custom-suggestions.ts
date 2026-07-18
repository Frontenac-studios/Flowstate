import "server-only";

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { chatCustomSuggestions } from "@/db/tables";
import { customSuggestionToDef } from "@/lib/chat/chat-suggestion-defs";
import type { ChatSuggestionDef } from "@/lib/chat/chat-suggestion-defs";
import {
  isEligibleForPhraseTracking,
  isGeneralizedCommand,
  matchesBuiltInPhrase,
  MAX_CUSTOM_SUGGESTIONS,
  normalizeChatPhrase,
  qualifiesForPromotion,
  truncateSuggestionLabel,
} from "@/lib/chat/chat-phrase-promotion";

export type RecordPhraseSendResult = {
  recorded: boolean;
  sendCount: number;
  promoted: boolean;
  suggestionId?: string;
};

async function enforcePromotionCap(userId: string): Promise<void> {
  const promoted = await db
    .select({
      id: chatCustomSuggestions.id,
      usageCount: chatCustomSuggestions.usageCount,
      promotedAt: chatCustomSuggestions.promotedAt,
    })
    .from(chatCustomSuggestions)
    .where(
      and(eq(chatCustomSuggestions.userId, userId), isNotNull(chatCustomSuggestions.promotedAt))
    )
    .orderBy(asc(chatCustomSuggestions.usageCount), asc(chatCustomSuggestions.promotedAt));

  if (promoted.length <= MAX_CUSTOM_SUGGESTIONS) return;

  const excess = promoted.length - MAX_CUSTOM_SUGGESTIONS;
  const toEvict = promoted.slice(0, excess);
  const now = new Date();

  for (const row of toEvict) {
    await db
      .update(chatCustomSuggestions)
      .set({ promotedAt: null, updatedAt: now })
      .where(eq(chatCustomSuggestions.id, row.id));
  }
}

export async function recordPhraseSend({
  userId,
  text,
}: {
  userId: string;
  text: string;
}): Promise<RecordPhraseSendResult> {
  const trimmed = text.trim();
  if (!isEligibleForPhraseTracking(trimmed)) {
    return { recorded: false, sendCount: 0, promoted: false };
  }

  const normalized = normalizeChatPhrase(trimmed);
  if (matchesBuiltInPhrase(normalized)) {
    return { recorded: false, sendCount: 0, promoted: false };
  }

  const label = truncateSuggestionLabel(trimmed);
  const now = new Date();

  const [existing] = await db
    .select()
    .from(chatCustomSuggestions)
    .where(
      and(
        eq(chatCustomSuggestions.userId, userId),
        eq(chatCustomSuggestions.normalizedText, normalized)
      )
    )
    .limit(1);

  const sendCount = (existing?.sendCount ?? 0) + 1;
  const qualifies = qualifiesForPromotion(trimmed, sendCount);
  const promoteNow = qualifies && !existing?.promotedAt;
  // Rows promoted under the old rules may no longer qualify — demote on the way past.
  const promotedAt = qualifies ? (existing?.promotedAt ?? now) : null;

  let row;
  if (existing) {
    [row] = await db
      .update(chatCustomSuggestions)
      .set({
        userText: trimmed,
        label,
        sendCount,
        promotedAt,
        updatedAt: now,
      })
      .where(eq(chatCustomSuggestions.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(chatCustomSuggestions)
      .values({
        userId,
        userText: trimmed,
        normalizedText: normalized,
        label,
        sendCount,
        usageCount: 0,
        promotedAt,
        updatedAt: now,
      })
      .returning();
  }

  if (!row) {
    throw new Error("Failed to record phrase send.");
  }

  if (promoteNow) {
    await enforcePromotionCap(userId);
  }

  return {
    recorded: true,
    sendCount: row.sendCount,
    promoted: promoteNow,
    suggestionId: promoteNow ? row.id : undefined,
  };
}

export async function listPromotedSuggestions(userId: string): Promise<ChatSuggestionDef[]> {
  const rows = await db
    .select({
      id: chatCustomSuggestions.id,
      label: chatCustomSuggestions.label,
      userText: chatCustomSuggestions.userText,
      usageCount: chatCustomSuggestions.usageCount,
    })
    .from(chatCustomSuggestions)
    .where(
      and(eq(chatCustomSuggestions.userId, userId), isNotNull(chatCustomSuggestions.promotedAt))
    )
    .orderBy(desc(chatCustomSuggestions.usageCount), desc(chatCustomSuggestions.promotedAt));

  // Rows promoted before the generalized-command gate existed are filtered out here
  // rather than deleted, so a stale chip stops rendering immediately. The row is
  // demoted for real on its next recordPhraseSend — queries must not write.
  return rows
    .filter((row) => isGeneralizedCommand(row.userText))
    .map((row) => customSuggestionToDef(row));
}

/**
 * Remove the row outright rather than just demoting, so the phrase starts from zero
 * and can re-earn a chip if it turns out to be a genuine habit.
 */
export async function deleteCustomSuggestion({
  userId,
  id,
}: {
  userId: string;
  id: string;
}): Promise<void> {
  await db
    .delete(chatCustomSuggestions)
    .where(and(eq(chatCustomSuggestions.id, id), eq(chatCustomSuggestions.userId, userId)));
}

/** Rename the chip label only — `userText` stays as sent so the command still works. */
export async function renameCustomSuggestion({
  userId,
  id,
  label,
}: {
  userId: string;
  id: string;
  label: string;
}): Promise<void> {
  await db
    .update(chatCustomSuggestions)
    .set({ label: truncateSuggestionLabel(label), updatedAt: new Date() })
    .where(and(eq(chatCustomSuggestions.id, id), eq(chatCustomSuggestions.userId, userId)));
}

export async function recordCustomSuggestionUsage({
  userId,
  id,
}: {
  userId: string;
  id: string;
}): Promise<void> {
  const [existing] = await db
    .select({ usageCount: chatCustomSuggestions.usageCount })
    .from(chatCustomSuggestions)
    .where(and(eq(chatCustomSuggestions.id, id), eq(chatCustomSuggestions.userId, userId)))
    .limit(1);

  if (!existing) return;

  await db
    .update(chatCustomSuggestions)
    .set({
      usageCount: existing.usageCount + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(chatCustomSuggestions.id, id), eq(chatCustomSuggestions.userId, userId)));
}
