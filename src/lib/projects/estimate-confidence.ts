/** Minimum completed tasks with estimates before showing a confident duration read. */
export const ESTIMATE_CONFIDENCE_MIN_SAMPLES = 3;

export function estimateConfidenceLabel(sampleCount: number): string | null {
  if (sampleCount >= ESTIMATE_CONFIDENCE_MIN_SAMPLES) return null;
  if (sampleCount === 0) return "learning…";
  return `learning… (${sampleCount}/${ESTIMATE_CONFIDENCE_MIN_SAMPLES})`;
}

export function formatEstimateMinutes(minutes: number, sampleCount: number): string {
  const base = `${minutes}m`;
  const learning = estimateConfidenceLabel(sampleCount);
  return learning ? `${base} · ${learning}` : base;
}
