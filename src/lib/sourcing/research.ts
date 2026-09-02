import { z } from "zod";

import type { SourcingSegment } from "./types";

/**
 * W10h — company research. The first capability in this app that reaches outside the
 * database: given a company name, find out enough about it that the scoring brain
 * (W10c) is judging facts instead of a name.
 *
 * The shape of the work is two steps, deliberately:
 *
 *  1. **Research** — a web-augmented model call that reads the open web and writes
 *     prose, with its sources.
 *  2. **Distill** — a second, ordinary structured call that turns that prose into
 *     `CompanyFacts`.
 *
 * They are separate because the two jobs want opposite things from a model: research
 * wants latitude to follow what it finds, extraction wants a schema it cannot leave.
 * Doing both in one call means either a schema fighting the search or free text that
 * needs regex-parsing — the thing W10c was built to avoid.
 *
 * **Every field is optional-by-honesty.** A fact the web didn't confirm belongs in
 * `unverified`, never guessed into a field: a fabricated employee count doesn't just
 * mis-score one lead, it teaches the Filter the wrong thing about the whole ICP.
 */

/** Cost cap per research call. Each result is billed, so this is a money knob. */
export const WEB_MAX_RESULTS = 5;

const sourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

/**
 * The extraction schema. Deliberately **permissive on size**: length and item caps
 * are enforced afterwards by `normalizeCompanyFacts`, not here.
 *
 * The first cut had `.max()` on every field and it failed in production on the very
 * first real page of research — a write-up richer than the fixture produced a summary
 * a little over the limit, and `generateObject` threw the ENTIRE result away rather
 * than return a slightly long string. A cap on a model's output turns "too long" into
 * "nothing at all", and the money already spent on the search is lost with it. Shape
 * belongs in the schema; size belongs in a clamp that cannot fail.
 */
export const companyFactsSchema = z.object({
  /** Two or three sentences: what the company does, for whom. */
  summary: z.string(),
  /** The industry as the web describes it, not as the ICP wishes it were. */
  industry: z.string().nullable(),
  /** Free text ("~40 staff", "Series A", "enterprise") — never a fabricated number. */
  sizeBand: z.string().nullable(),
  location: z.string().nullable(),
  /** Buying signals: hiring, funding, launches, migrations, public complaints. */
  signals: z.array(z.string()),
  /** Anything about how they build — stack, vendors, in-house vs agency. */
  techStack: z.array(z.string()),
  /** What could NOT be confirmed. Feeds the score's `gaps` and lowers confidence. */
  unverified: z.array(z.string()),
  sources: z.array(sourceSchema),
});

/** Storage limits, applied after extraction so an overrun trims instead of throwing. */
export const FACT_LIMITS = {
  summary: 1200,
  shortField: 200,
  item: 300,
  signals: 8,
  techStack: 12,
  unverified: 8,
  sources: 12,
  url: 2000,
} as const;

function clampText(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function clampNullable(value: string | null, max: number): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : clampText(trimmed, max);
}

function clampList(values: string[], maxItems: number, maxLength: number): string[] {
  return values
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, maxItems)
    .map((v) => clampText(v, maxLength));
}

/**
 * Bring extracted facts within storage limits. Total, deterministic, and never
 * throws — whatever the model returned, something usable comes back.
 *
 * Sources are de-duplicated by URL: a model citing the same careers page four times
 * would otherwise crowd out the other sources under the cap.
 */
export function normalizeCompanyFacts(raw: CompanyFacts): CompanyFacts {
  const seen = new Set<string>();
  const sources: CompanyFacts["sources"] = [];
  for (const source of raw.sources) {
    const url = source.url.trim();
    if (!url || url.length > FACT_LIMITS.url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: clampText(source.title, FACT_LIMITS.shortField), url });
    if (sources.length >= FACT_LIMITS.sources) break;
  }

  return {
    summary: clampText(raw.summary, FACT_LIMITS.summary),
    industry: clampNullable(raw.industry, FACT_LIMITS.shortField),
    sizeBand: clampNullable(raw.sizeBand, FACT_LIMITS.shortField),
    location: clampNullable(raw.location, FACT_LIMITS.shortField),
    signals: clampList(raw.signals, FACT_LIMITS.signals, FACT_LIMITS.item),
    techStack: clampList(raw.techStack, FACT_LIMITS.techStack, FACT_LIMITS.shortField),
    unverified: clampList(raw.unverified, FACT_LIMITS.unverified, FACT_LIMITS.item),
    sources,
  };
}

export type CompanyFacts = z.infer<typeof companyFactsSchema>;

/**
 * The research call's prompt. It names the ICP segments so the search goes after the
 * facts that will actually matter to the score, rather than a generic company blurb —
 * but it must not be told what a "good" answer looks like, or it will find it.
 */
export function buildResearchPrompt(inputs: {
  companyName: string;
  companyNotes: string;
  segments: SourcingSegment[];
}): { system: string; prompt: string } {
  const system = [
    "You research companies on the open web for a solo B2B services consultant.",
    "Report only what the sources actually say. Never infer a headcount, a funding stage, a budget or a technology that no source states.",
    "If something cannot be found, say so plainly — an unknown is a useful answer here, a guess is not.",
    "Prefer primary sources (the company site, its careers page, its engineering blog, filings) over aggregators and directories, which are often years stale.",
    "Be concrete and terse. No sales language, no speculation about whether they would be a good client — that judgement is made elsewhere.",
  ].join("\n");

  const criteria = inputs.segments.length
    ? inputs.segments.map((s) => `- ${s.label}: ${s.firmographics}`).join("\n")
    : "(no segments configured — report the general profile)";

  const prompt = [
    `# Company\n${inputs.companyName}`,
    inputs.companyNotes
      ? `# What is already known (verify, don't repeat)\n${inputs.companyNotes}`
      : "",
    `# The facts that matter\n${criteria}`,
    [
      "# What to find",
      "- What the company does and who it sells to",
      "- Rough size and stage, ONLY if a source states it",
      "- Where it is based",
      "- Recent signals: hiring, funding, launches, migrations, leadership changes",
      "- How it builds software: in-house team, agencies, visible stack",
      "- Anything that would make it a poor fit for outside product work",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, prompt };
}

/** Turn the research prose into the structured facts. No web access on this call. */
export function buildDistillPrompt(inputs: {
  companyName: string;
  research: string;
  /** The pages the search consulted, so the model can attribute rather than invent. */
  sources?: { title: string; url: string }[];
}): {
  system: string;
  prompt: string;
} {
  const system = [
    "You extract structured company facts from a research write-up.",
    "Copy only what the write-up states. Do not add knowledge of your own, even if you are confident it is true — the write-up is the whole world for this task.",
    "Anything the write-up calls unknown, unclear or unconfirmed goes in `unverified`, and the corresponding field stays null or empty.",
    "Keep each field to its point: `industry` is a short label, `location` a place — long explanations belong in the summary.",
    "Put in `sources` only URLs that appear in the material given to you. Never write a URL from memory.",
  ].join("\n");

  const sources = inputs.sources?.length
    ? `\n\n# Sources consulted\n${inputs.sources.map((s) => `- ${s.title || "(untitled)"}: ${s.url}`).join("\n")}`
    : "";

  const prompt = `# Company\n${inputs.companyName}\n\n# Research write-up\n${inputs.research}${sources}`;

  return { system, prompt };
}

/**
 * Combine the vendor's citations with any the model transcribed, vendor first.
 *
 * The vendor's list is what the search engine actually returned; the model's is text
 * it wrote, and a model writing a plausible URL from memory is exactly the failure
 * this whole module is built to avoid. Ordering them this way means the caps in
 * `normalizeCompanyFacts` drop the model's guesses first.
 */
export function mergeSources(
  vendor: { title: string; url: string }[],
  extracted: { title: string; url: string }[]
): { title: string; url: string }[] {
  return [...vendor, ...extracted];
}

/**
 * Render researched facts for the scoring prompt. Kept separate from the user's own
 * notes and labelled with its provenance, so the brain can tell "the web says" from
 * "the owner says" — they do not carry the same weight, and the owner's note is the
 * one that wins on a conflict.
 */
export function renderFactsForScoring(facts: CompanyFacts): string {
  const lines: string[] = [facts.summary];

  if (facts.industry) lines.push(`Industry: ${facts.industry}`);
  if (facts.sizeBand) lines.push(`Size/stage: ${facts.sizeBand}`);
  if (facts.location) lines.push(`Location: ${facts.location}`);
  if (facts.signals.length) lines.push(`Signals: ${facts.signals.join("; ")}`);
  if (facts.techStack.length) lines.push(`How they build: ${facts.techStack.join(", ")}`);
  if (facts.unverified.length) {
    lines.push(`Could not be confirmed: ${facts.unverified.join("; ")}`);
  }
  if (facts.sources.length) {
    lines.push(`Sources: ${facts.sources.map((s) => s.url).join(" ")}`);
  }

  return lines.join("\n");
}

/** True when the facts carry nothing a score could stand on. */
export function factsAreEmpty(facts: CompanyFacts): boolean {
  return (
    facts.summary.trim().length === 0 &&
    facts.industry === null &&
    facts.sizeBand === null &&
    facts.signals.length === 0 &&
    facts.techStack.length === 0
  );
}
