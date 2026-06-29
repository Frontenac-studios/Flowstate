/**
 * Auto-ramp-by-phase-order project color (VF-4, decision VF4).
 *
 * Each project owns a stable hue (so its phases read as one family and distinct
 * projects stay distinguishable). Within a project, a phase's color steps along
 * a lightness ramp keyed on its order — phase = identity by position, not status
 * — so earlier phases read lighter and later phases darker. Tasks with no phase
 * fall back to the project's base lightness; no project → a neutral marker.
 *
 * `phaseOrdinal` is the phase's order within its project (its `sortOrder`); the
 * same basis is used on the plan rows and in the Miller phase rows.
 */
const RAMP_BASE_LIGHTNESS = 56;
const RAMP_STEP = 8;
const RAMP_MIN_LIGHTNESS = 34;
const RAMP_MAX_LIGHTNESS = 64;

function projectHue(projectId: string): number {
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash = (hash * 31 + projectId.charCodeAt(i)) % 360;
  }
  return hash;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function phaseRampColor(projectId: string | null, phaseOrdinal?: number | null): string {
  if (!projectId) return "var(--ink-muted)";
  const hue = projectHue(projectId);
  if (phaseOrdinal == null) {
    return `hsl(${hue} 52% ${RAMP_BASE_LIGHTNESS}%)`;
  }
  // Earlier phases lighter, later phases darker; clamped so long projects don't
  // run off the ramp.
  const lightness = clamp(
    RAMP_MAX_LIGHTNESS - phaseOrdinal * RAMP_STEP,
    RAMP_MIN_LIGHTNESS,
    RAMP_MAX_LIGHTNESS
  );
  return `hsl(${hue} 52% ${lightness}%)`;
}
