import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { syncEvidenceEditionRow } from "@/db/record-sync-mutation";
import type { EvidenceEditionKind } from "@/db/schema/evidence-editions";
import { evidenceEditions as evidenceEditionsTable } from "@/db/tables";
import { parseISODateString, toISODateString } from "@/lib/dates/local-day";

import { aggregateEditionInput, templateEvidenceNarrative } from "./aggregate-edition-input";

export async function generateEvidenceEdition(params: {
  userId: string;
  kind: EvidenceEditionKind;
  periodStart: string;
  periodEnd: string;
  refId?: string | null;
}) {
  const input = await aggregateEditionInput(params.userId, params.periodStart, params.periodEnd);
  const narrative = templateEvidenceNarrative(input);

  const [row] = await db
    .insert(evidenceEditionsTable)
    .values({
      userId: params.userId,
      kind: params.kind,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      refId: params.refId ?? null,
      narrative,
      state: "unseen",
    })
    .returning();

  if (!row) throw new Error("Failed to create evidence edition.");
  await syncEvidenceEditionRow(row.id, "insert", row);
  return row;
}

export function quarterPeriodForDate(isoDate: string): { start: string; end: string } {
  const d = parseISODateString(isoDate);
  const month = d.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const start = new Date(Date.UTC(d.getUTCFullYear(), quarterStartMonth, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), quarterStartMonth + 3, 0));
  return { start: toISODateString(start), end: toISODateString(end) };
}

export function monthPeriodForDate(isoDate: string): { start: string; end: string } {
  const d = parseISODateString(isoDate);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { start: toISODateString(start), end: toISODateString(end) };
}

export async function getLatestEvidenceEdition(userId: string) {
  const [row] = await db
    .select()
    .from(evidenceEditionsTable)
    .where(eq(evidenceEditionsTable.userId, userId))
    .orderBy(desc(evidenceEditionsTable.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listEvidenceEditions(userId: string, limit = 12) {
  return db
    .select()
    .from(evidenceEditionsTable)
    .where(eq(evidenceEditionsTable.userId, userId))
    .orderBy(desc(evidenceEditionsTable.createdAt))
    .limit(limit);
}

export async function markEvidenceEditionSeen(userId: string, id: string) {
  const [row] = await db
    .update(evidenceEditionsTable)
    .set({ state: "seen", updatedAt: new Date() })
    .where(and(eq(evidenceEditionsTable.id, id), eq(evidenceEditionsTable.userId, userId)))
    .returning();
  if (row) await syncEvidenceEditionRow(row.id, "update", row);
  return row ?? null;
}

export async function maybeGeneratePeriodicEdition(
  userId: string,
  cadence: "monthly" | "quarterly" | "off",
  todayIso: string
) {
  if (cadence === "off") return null;

  const period =
    cadence === "monthly" ? monthPeriodForDate(todayIso) : quarterPeriodForDate(todayIso);

  const [existing] = await db
    .select({ id: evidenceEditionsTable.id })
    .from(evidenceEditionsTable)
    .where(
      and(
        eq(evidenceEditionsTable.userId, userId),
        eq(evidenceEditionsTable.kind, "periodic"),
        eq(evidenceEditionsTable.periodStart, period.start)
      )
    )
    .limit(1);

  if (existing) return null;

  return generateEvidenceEdition({
    userId,
    kind: "periodic",
    periodStart: period.start,
    periodEnd: period.end,
  });
}
