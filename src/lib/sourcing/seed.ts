import { DEFAULT_VOICE, DEFAULT_WEIGHTS } from "./constants";
import type { OutreachVoice, SourcingSegment, SourcingWeights } from "./types";

export type IcpSeedInputs = {
  /** Active Direction statements (the hard gate — the rule for what work you take). */
  directions: string[];
  /** Won-client names — positive examples the ICP is shaped around. */
  wonClientNames: string[];
  /** Active Target titles — the quarterly lens. */
  targetTitles: string[];
  /** The rate floor in cents, if a rate is set. */
  rateFloorCents: number | null;
};

export type IcpSeed = {
  segments: SourcingSegment[];
  exclusions: string[];
  weights: SourcingWeights;
  outreachVoice: OutreachVoice;
};

/**
 * A non-AI starter ICP the user edits (W10b). Auto-seed from what the app already
 * knows: the active Direction becomes the first segment's firmographics (plus the
 * won-clients as "companies like these" and the rate floor as a plausibility note),
 * Targets ride along as the quarterly lens. The real per-company scoring is the
 * brain's job (W10c); this just fills the form so the user isn't staring at blanks.
 * Pure — the router feeds it rows.
 */
export function buildIcpSeed(inputs: IcpSeedInputs): IcpSeed {
  const directionLine = inputs.directions[0] ?? "";
  const likeLine = inputs.wonClientNames.length
    ? ` Companies like: ${inputs.wonClientNames.slice(0, 5).join(", ")}.`
    : "";
  const rateLine =
    inputs.rateFloorCents != null
      ? ` Budget plausibility floor ≈ $${Math.round(inputs.rateFloorCents / 100)}/hr.`
      : "";
  const targetLine = inputs.targetTitles.length
    ? ` This quarter's lens: ${inputs.targetTitles.slice(0, 3).join("; ")}.`
    : "";

  const firmographics = `${directionLine}${likeLine}${rateLine}${targetLine}`.trim();

  const segments: SourcingSegment[] = [
    {
      id: "primary",
      label: "Primary",
      firmographics: firmographics || "Describe the companies worth pursuing.",
    },
  ];

  return {
    segments,
    exclusions: [],
    weights: DEFAULT_WEIGHTS,
    outreachVoice: DEFAULT_VOICE,
  };
}
