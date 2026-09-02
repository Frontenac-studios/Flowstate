import { z } from "zod";

import type { CompanyFacts } from "./research";

/**
 * W10j — enrichment: a second, targeted pass at the facts research came back
 * unsure about.
 *
 * The design constraint from the plan is "web-only in v1, turn a vendor on
 * per-segment only when confidence runs chronically low" — so the shape here is a
 * seam, not a purchase. Nothing in this file talks to a data vendor. What it does is
 * make swapping one in a local change: an adapter that fills gaps, an enum on the
 * segment saying how hard to try, and a read that tells you WHICH segment would
 * actually benefit.
 *
 * That last part is what stops enrichment becoming a reflex. A vendor bought because
 * "more data is better" is money spent on every company; a vendor bought because one
 * segment has averaged 48% confidence over a dozen leads is a decision with evidence
 * behind it.
 */

/** Fields enrichment may fill. Deliberately the thin, checkable ones. */
export const enrichmentPatchSchema = z.object({
  /** A resolved value for a field research left null, or null if still unknown. */
  industry: z.string().nullable(),
  sizeBand: z.string().nullable(),
  location: z.string().nullable(),
  /** Signals found on this pass that the first one missed. */
  signals: z.array(z.string()),
  techStack: z.array(z.string()),
  /** Which of the original gaps this pass CLOSED — verbatim from the input list. */
  resolved: z.array(z.string()),
  /** What remains unconfirmed after trying again. */
  stillUnverified: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export type EnrichmentPatch = z.infer<typeof enrichmentPatchSchema>;

/**
 * A gap-fill prompt aimed at named unknowns rather than the company in general.
 *
 * It is a different job from research and wants a different instruction: research
 * asks "what is true of this company?", enrichment asks "here are five things nobody
 * could confirm — go and confirm them, or say again that you can't". Re-running the
 * general research prompt would mostly re-find what is already known.
 */
export function buildGapFillPrompt(inputs: {
  companyName: string;
  facts: CompanyFacts;
  gaps: string[];
}): { system: string; prompt: string } {
  const system = [
    "You close specific factual gaps about a company using the open web.",
    "You are given facts already established and a list of things that could NOT be confirmed. Work only on that list.",
    "A gap you still cannot confirm goes in `stillUnverified`, unchanged. Saying 'still unknown' is a correct and useful answer — never resolve a gap with a guess, an industry average, or a figure from an aggregator that contradicts the company's own site.",
    "Put a gap in `resolved` ONLY if a source you found actually states it, and copy the gap text verbatim from the list you were given.",
  ].join("\n");

  const prompt = [
    `# Company\n${inputs.companyName}`,
    `# Already established\n${inputs.facts.summary}`,
    `# Could not be confirmed — work on these\n${inputs.gaps.map((g) => `- ${g}`).join("\n")}`,
  ].join("\n\n");

  return { system, prompt };
}

/**
 * Fold a patch into the facts.
 *
 * Enrichment may only FILL, never overwrite: a field research established stands, and
 * a second pass that "corrects" it would silently prefer whichever source happened to
 * come last. The gaps it claims to have resolved are dropped from `unverified` only
 * if they were genuinely on the list — a model returning a `resolved` entry nobody
 * asked about doesn't get to quietly shrink the list of things you don't know.
 */
export function applyEnrichment(facts: CompanyFacts, patch: EnrichmentPatch): CompanyFacts {
  const claimed = new Set(patch.resolved.map((g) => g.trim().toLowerCase()));
  const original = new Set(facts.unverified.map((g) => g.trim().toLowerCase()));
  const genuinelyResolved = new Set(Array.from(claimed).filter((g) => original.has(g)));

  const remaining = facts.unverified.filter(
    (gap) => !genuinelyResolved.has(gap.trim().toLowerCase())
  );

  // Anything the pass newly flags as unconfirmed joins the list, without duplicates.
  const seen = new Set(remaining.map((g) => g.trim().toLowerCase()));
  for (const gap of patch.stillUnverified) {
    const key = gap.trim().toLowerCase();
    if (!key || seen.has(key) || genuinelyResolved.has(key)) continue;
    seen.add(key);
    remaining.push(gap.trim());
  }

  const mergeList = (existing: string[], added: string[]) => {
    const out = [...existing];
    const keys = new Set(existing.map((v) => v.trim().toLowerCase()));
    for (const value of added) {
      const key = value.trim().toLowerCase();
      if (!key || keys.has(key)) continue;
      keys.add(key);
      out.push(value.trim());
    }
    return out;
  };

  return {
    ...facts,
    industry: facts.industry ?? patch.industry,
    sizeBand: facts.sizeBand ?? patch.sizeBand,
    location: facts.location ?? patch.location,
    signals: mergeList(facts.signals, patch.signals),
    techStack: mergeList(facts.techStack, patch.techStack),
    unverified: remaining,
    sources: [...facts.sources, ...patch.sources],
  };
}

/** Below this mean confidence, over at least this many scored leads, a segment is struggling. */
export const CHRONIC_CONFIDENCE_MEAN = 55;
export const CHRONIC_MIN_SAMPLE = 5;

export type SegmentHealth = {
  segmentId: string;
  scored: number;
  meanConfidence: number;
  /** Enough leads, and consistently low confidence — the case for a data vendor. */
  chronicallyLow: boolean;
};

/**
 * Mean confidence per ICP segment — the evidence for "should this segment get a
 * paid enrichment vendor?".
 *
 * Confidence, not score, on purpose. A segment full of low-SCORING companies means
 * the ICP is pointed at the wrong market and a vendor would just describe the wrong
 * companies more precisely. A segment full of low-CONFIDENCE companies means the
 * agent keeps failing to find out enough — which is exactly what buying data fixes.
 *
 * A small sample says nothing, so a segment under `CHRONIC_MIN_SAMPLE` is never
 * flagged however bad it looks.
 */
export function segmentConfidenceHealth(
  leads: ReadonlyArray<{ segment: string | null; confidence: number | null }>
): SegmentHealth[] {
  const bySegment = new Map<string, number[]>();

  for (const lead of leads) {
    if (!lead.segment || lead.confidence == null) continue;
    const list = bySegment.get(lead.segment) ?? [];
    list.push(lead.confidence);
    bySegment.set(lead.segment, list);
  }

  return Array.from(bySegment.entries())
    .map(([segmentId, confidences]) => {
      const meanConfidence =
        confidences.reduce((total: number, c: number) => total + c, 0) /
        Math.max(1, confidences.length);
      return {
        segmentId,
        scored: confidences.length,
        meanConfidence: Math.round(meanConfidence),
        chronicallyLow:
          confidences.length >= CHRONIC_MIN_SAMPLE && meanConfidence < CHRONIC_CONFIDENCE_MEAN,
      };
    })
    .sort((a, b) => a.meanConfidence - b.meanConfidence);
}

/** Should this lead get a gap-fill pass? */
export function shouldEnrich(inputs: {
  mode: "off" | "web" | undefined;
  confidence: number | null;
  gaps: string[];
  /** Only enrich below this confidence — a well-understood company needs nothing. */
  threshold?: number;
}): boolean {
  if (inputs.mode !== "web") return false;
  if (inputs.gaps.length === 0) return false;
  if (inputs.confidence == null) return false;
  return inputs.confidence < (inputs.threshold ?? CHRONIC_CONFIDENCE_MEAN);
}
