/** A dependency edge: `blocker` must finish before `blocked`. Phase 3 (3.g). */
export type DependencyEdge = {
  blockerTaskId: string;
  blockedTaskId: string;
  /** null = durable project edge; a Date = window edge expiring at that instant (3.i). */
  expiresAt: Date | null;
};
