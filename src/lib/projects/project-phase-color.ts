/**
 * VF-1 first-pass project indicator color.
 *
 * VF-4 replaces this with the real auto-ramp-by-phase-order (decision VF4): a
 * sequential ramp keyed on a phase's position within its project. For now we
 * derive a stable per-project hue so different projects read as distinct dots,
 * behind the same call site the ramp will later use.
 */
export function projectPhaseColor(projectId: string | null): string {
  if (!projectId) return "var(--kash-ink-muted)";
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash = (hash * 31 + projectId.charCodeAt(i)) % 360;
  }
  return `hsl(${hash} 52% 52%)`;
}
