import "server-only";

import { generateText } from "ai";

import { isModelConfigured } from "@/lib/env";

import { requireModel } from "../claude/client";

/**
 * The one place AI drafting earns its keep in the money half (W4, product law 1):
 * turning raw timer descriptions into a client-readable line — a clean label and a
 * one-sentence "what was delivered". It writes WORDS ONLY. Every number (hours,
 * amounts, which entries billed) is already decided by the pure draft engine and is
 * never sent back through here, so the model cannot move a dollar. The user edits
 * the wording before accepting.
 *
 * When no model is configured it falls back to a deterministic label from the work
 * itself, so a draft always renders — the AI is an enhancement, not a dependency.
 */

export type LineToDraft = {
  /** Stable index the model must echo back so we can map wording to the right line. */
  index: number;
  /** The engine's seed label (a raw description, or "Additional work" for the merge line). */
  seedLabel: string;
  /** Every raw timer description folded into this line. */
  rawLabels: string[];
  /** Billed hours for the line (for the model's context only — it never changes them). */
  hours: number;
  isAdditional: boolean;
};

export type DraftedLineWording = {
  index: number;
  label: string;
  description: string;
};

/** Title-case a raw description into a passable client-facing label. */
function fallbackLabel(seedLabel: string): string {
  const trimmed = seedLabel.trim();
  if (!trimmed) return "Work";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function fallbackWording(lines: readonly LineToDraft[]): DraftedLineWording[] {
  return lines.map((line) => ({
    index: line.index,
    label: line.isAdditional ? "Additional work" : fallbackLabel(line.seedLabel),
    description: "",
  }));
}

function parseWording(text: string, lines: readonly LineToDraft[]): DraftedLineWording[] | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const byIndex = new Map<number, { label?: unknown; description?: unknown }>();
  for (const item of parsed) {
    if (item && typeof item === "object" && "index" in item) {
      const idx = (item as { index: unknown }).index;
      if (typeof idx === "number")
        byIndex.set(idx, item as { label?: unknown; description?: unknown });
    }
  }

  // Every line must come back with a usable label, or we distrust the whole set.
  const result: DraftedLineWording[] = [];
  for (const line of lines) {
    const hit = byIndex.get(line.index);
    const label = typeof hit?.label === "string" ? hit.label.trim() : "";
    const description = typeof hit?.description === "string" ? hit.description.trim() : "";
    if (!label) return null;
    result.push({
      index: line.index,
      label: line.isAdditional ? "Additional work" : label,
      description,
    });
  }
  return result;
}

export async function draftInvoiceLineItems(params: {
  clientName: string;
  lines: readonly LineToDraft[];
}): Promise<DraftedLineWording[]> {
  const { clientName, lines } = params;
  const fallback = fallbackWording(lines);

  if (lines.length === 0 || !isModelConfigured()) return fallback;

  const lineBlock = lines
    .map(
      (line) =>
        `  { "index": ${line.index}, "hours": ${line.hours.toFixed(2)}, "raw": ${JSON.stringify(
          line.rawLabels.join("; ")
        )}${line.isAdditional ? ', "isAdditional": true' : ""} }`
    )
    .join("\n");

  const system = [
    "You write client-facing invoice line items for a solo service business.",
    "You are handed grouped timer descriptions and must turn each group into ONE",
    "clean label and ONE plain-English sentence describing what the client received.",
    "Rules: outcome language, not internal shorthand or tool minutiae. Never invent",
    "work not present in the raw descriptions. Never mention hours, dollars, or dates.",
    'For any group marked "isAdditional", keep the label exactly "Additional work".',
  ].join("\n");

  const userPayload = [
    `Client: ${clientName}`,
    'Respond with JSON only: an array of {"index":N,"label":"...","description":"..."}.',
    "One object per input line, echoing its index. Label ≤ 6 words; description one sentence.",
    "",
    "Lines:",
    lineBlock,
  ].join("\n");

  try {
    const { text } = await generateText({
      model: requireModel("structured"),
      maxOutputTokens: 700,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: userPayload }],
    });
    return parseWording(text, lines) ?? fallback;
  } catch {
    return fallback;
  }
}
