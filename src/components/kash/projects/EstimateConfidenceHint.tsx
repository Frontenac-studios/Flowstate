import { estimateConfidenceLabel } from "@/lib/projects/estimate-confidence";

type Props = {
  sampleCount: number;
};

/** §9 tail — gentle "still learning" hint until enough completed estimates exist. */
export function EstimateConfidenceHint({ sampleCount }: Props) {
  const label = estimateConfidenceLabel(sampleCount);
  if (!label) return null;

  return <span className="text-ink-faint">{label}</span>;
}
