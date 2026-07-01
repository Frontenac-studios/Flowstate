import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { syncAboutMeRow } from "@/db/record-sync-mutation";
import { aboutMeSuggestions, userValues } from "@/db/tables";
import { aboutMeSuggestionPayloadKey, type AboutMeEditProposal } from "@/lib/about-me/propose";
import { parseSuggestionPayload, type ValueSuggestionPayload } from "@/lib/about-me/suggestions";
import { canAddValue, isDuplicateValue } from "@/lib/about-me/values";

export type ProposeAboutMeEditResult = {
  created: { id: string; targetSection: string }[];
  skipped: number;
};

export async function proposeAboutMeEdit(
  userId: string,
  proposals: AboutMeEditProposal[]
): Promise<ProposeAboutMeEditResult> {
  if (proposals.length === 0) return { created: [], skipped: 0 };

  const [pendingRows, valueRows] = await Promise.all([
    db
      .select({
        targetSection: aboutMeSuggestions.targetSection,
        payload: aboutMeSuggestions.payload,
        sourceText: aboutMeSuggestions.sourceText,
      })
      .from(aboutMeSuggestions)
      .where(and(eq(aboutMeSuggestions.userId, userId), eq(aboutMeSuggestions.status, "pending"))),
    db.select({ label: userValues.label }).from(userValues).where(eq(userValues.userId, userId)),
  ]);

  const existingPayloadKeys = new Set(
    pendingRows.map((row) => aboutMeSuggestionPayloadKey(row.targetSection, row.payload))
  );
  const existingSourceTexts = new Set(
    pendingRows.map((row) => row.sourceText).filter((text): text is string => Boolean(text))
  );
  const valueLabels = valueRows.map((row) => row.label);

  const created: ProposeAboutMeEditResult["created"] = [];
  let skipped = 0;
  const learnedAtDefault = new Date();

  for (const proposal of proposals) {
    if (existingSourceTexts.has(proposal.sourceText)) {
      skipped += 1;
      continue;
    }

    let payload: unknown;
    try {
      payload = parseSuggestionPayload(proposal.targetSection, proposal.payload);
    } catch {
      skipped += 1;
      continue;
    }

    const payloadKey = aboutMeSuggestionPayloadKey(proposal.targetSection, payload);
    if (existingPayloadKeys.has(payloadKey)) {
      skipped += 1;
      continue;
    }

    if (proposal.targetSection === "values") {
      const { label } = payload as ValueSuggestionPayload;
      if (isDuplicateValue(label, valueLabels) || !canAddValue(valueLabels.length)) {
        skipped += 1;
        continue;
      }
    }

    const [row] = await db
      .insert(aboutMeSuggestions)
      .values({
        userId,
        targetSection: proposal.targetSection,
        payload,
        sourceText: proposal.sourceText,
        learnedAt: proposal.learnedAt ?? learnedAtDefault,
        status: "pending",
      })
      .returning();

    if (!row) {
      skipped += 1;
      continue;
    }

    await syncAboutMeRow("about_me_suggestions", row.id, "insert", row);
    created.push({ id: row.id, targetSection: row.targetSection });
    existingPayloadKeys.add(payloadKey);
    existingSourceTexts.add(proposal.sourceText);
    if (proposal.targetSection === "values") {
      valueLabels.push((payload as ValueSuggestionPayload).label);
    }
  }

  return { created, skipped };
}
