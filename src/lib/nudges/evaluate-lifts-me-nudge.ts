export type LiftsMeNudgeInput = {
  practices: ReadonlyArray<{ activityId: string; title: string }>;
  /** Last occurredAt per activityId (ISO or Date). */
  lastOccurredAt: ReadonlyMap<string, Date>;
  now: Date;
  alreadyNudgedToday: boolean;
};

export type EvaluateLiftsMeNudgeResult = {
  shouldFire: boolean;
  message: string;
  activityId?: string;
};

const QUIET_DAYS = 7;

export function templateLiftsMeMessage(title: string, daysSince: number): string {
  const rounded = Math.max(QUIET_DAYS, Math.round(daysSince));
  return `It's been about ${rounded} days since ${title.toLowerCase()} — still lifts you?`;
}

/** Occasional chip from regularity / explicit "lifts me" data (SC-4). */
export function evaluateLiftsMeNudge(input: LiftsMeNudgeInput): EvaluateLiftsMeNudgeResult {
  if (input.alreadyNudgedToday || input.practices.length === 0) {
    return { shouldFire: false, message: "" };
  }

  let best: { activityId: string; title: string; daysSince: number } | null = null;

  for (const practice of input.practices) {
    const last = input.lastOccurredAt.get(practice.activityId);
    const daysSince = last
      ? (input.now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      : QUIET_DAYS + 1;

    if (daysSince >= QUIET_DAYS && (best == null || daysSince > best.daysSince)) {
      best = { activityId: practice.activityId, title: practice.title, daysSince };
    }
  }

  if (!best) {
    return { shouldFire: false, message: "" };
  }

  return {
    shouldFire: true,
    message: templateLiftsMeMessage(best.title, best.daysSince),
    activityId: best.activityId,
  };
}
