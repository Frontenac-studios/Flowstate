import { z } from "zod";

import type { LeadRationale, OutreachVoice } from "./types";

/**
 * The structured shape the outreach drafter returns (W10e): one opener and a small
 * set of aging-clock follow-ups. Fed to the AI SDK's `generateObject` so the model
 * stays on-format. Bodies only — Flowstate drafts, you send (Law 1); there's no
 * recipient yet (email/enrichment is W10j), so the UI offers copy / open-in-mail.
 */
export const draftResultSchema = z.object({
  opener: z.string().min(1).max(2000),
  followUps: z.array(z.string().min(1).max(2000)).max(3),
});

export type DraftResult = z.infer<typeof draftResultSchema>;

export type OutreachInputs = {
  companyName: string;
  /** Whatever facts the user pasted / the agent gathered (web research is W10h). */
  companyNotes: string;
  /** Why they scored — the opener leads with a real reason, not a template. */
  rationale: LeadRationale | null;
  /** The editable voice profile the drafter mirrors (W10b settings). */
  voice: OutreachVoice;
  /** Active Direction statements — what work is on offer. */
  directions: string[];
  /** Won-client names — the analogous social proof, cited only if the voice opts in. */
  wonClientNames: string[];
  /** How many aging-clock follow-ups to draft after the opener. */
  followUpCount: number;
};

const WARMTH_GUIDANCE = {
  warm: "Warm and personable, but not familiar — you haven't met yet.",
  professional: "Professional and plain: respectful, direct, no fluff.",
  formal: "Formal and precise.",
} as const;

const LENGTH_GUIDANCE = {
  short: "Keep the opener to ~90 words at most; each follow-up shorter still.",
  medium: "Keep the opener to ~150 words at most; each follow-up shorter still.",
} as const;

/**
 * Build the outreach prompt. Pure, so the rules are unit-testable without a model.
 * Encodes Law 1 (draft only, never claim sent), the no-invented-facts rule, the
 * voice profile, and the opener-leads-with-a-real-reason shape.
 */
export function buildOutreachPrompt(inputs: OutreachInputs): { system: string; prompt: string } {
  const { voice } = inputs;
  // Lead with the confirmable positives — the fit and the need they have; the
  // value/WTP facet is your pricing read, not a selling point to put in an opener.
  const fitReasons = [inputs.rationale?.fit, inputs.rationale?.need]
    .flatMap((f) => f?.reasons ?? [])
    .slice(0, 4);

  const system = [
    "You draft cold outbound emails for a solo B2B services consultant.",
    "You DRAFT only — the consultant reads, edits, and sends every message. Never state or imply a message was already sent.",
    `Write ${inputs.followUpCount + 1} messages: one opener, then ${inputs.followUpCount} follow-ups spaced days apart (an aging clock).`,
    WARMTH_GUIDANCE[voice.warmth],
    LENGTH_GUIDANCE[voice.length],
    "The opener leads with ONE specific, true reason this company is a fit, drawn only from the info given. Never invent facts, numbers, names, or events.",
    "Make exactly one clear, low-friction ask (a brief call or a reply). No pushiness, no false urgency, no guilt-tripping.",
    voice.citeAnalogousClient && inputs.wonClientNames.length
      ? "Cite ONE genuinely comparable past client by name as light social proof — only if it actually fits."
      : "Do not name-drop past clients.",
    "Each follow-up briefly references the prior note, adds one new angle or a lighter touch, and is shorter than the last.",
    voice.signature.trim()
      ? `End every message with this signature exactly, verbatim:\n${voice.signature.trim()}`
      : "Do not invent a signature, company, or sign-off name.",
    voice.voiceSample.trim()
      ? "Mirror the cadence, vocabulary, and formatting of the voice sample below — its style, not its content."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    `# Company\n${inputs.companyName}\n${inputs.companyNotes || "(no additional info provided)"}`,
    `# Why they fit (use only the true ones)\n${
      fitReasons.join("\n") || "(not scored yet — lead with what's in the company info above)"
    }`,
    `# What I do (Direction)\n${inputs.directions.join("\n") || "(none set)"}`,
    `# Comparable past clients\n${inputs.wonClientNames.join(", ") || "(none)"}`,
    voice.voiceSample.trim()
      ? `# Voice sample (mirror the style, not the content)\n${voice.voiceSample.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, prompt };
}

/**
 * A `mailto:` for one drafted message. No recipient — the agent doesn't have the
 * prospect's address yet (enrichment is W10j) — so this just opens the user's mail
 * client with the body prefilled. `encodeURIComponent` (not URLSearchParams, which
 * would encode spaces as `+`) so the body renders faithfully.
 */
export function buildMailto(body: string): string {
  return `mailto:?body=${encodeURIComponent(body)}`;
}
