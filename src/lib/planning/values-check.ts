import { VALUES_MIN } from "@/lib/about-me/constants";

export type ValueRow = {
  id: string;
  label: string;
};

export type ValuesCheckGoalRow = {
  valueId: string | null;
  state: string;
  targetYear: number | null;
};

export type ValuesMisalignment = {
  quietValues: ValueRow[];
  untaggedGoalCount: number;
  activeGoalCount: number;
};

/**
 * Simple values-alignment scan for check-in (§13 V1-4, PM-7).
 * Returns null when the user has fewer than VALUES_MIN values or activity looks aligned.
 */
export function detectValuesMisalignment(
  values: readonly ValueRow[],
  goals: readonly ValuesCheckGoalRow[],
  scopeYear: number
): ValuesMisalignment | null {
  if (values.length < VALUES_MIN) return null;

  const activeGoals = goals.filter((g) => g.state === "active" && g.targetYear === scopeYear);
  if (activeGoals.length === 0) return null;

  const taggedCountByValue = new Map<string, number>();
  for (const value of values) {
    taggedCountByValue.set(value.id, 0);
  }

  let untaggedGoalCount = 0;
  for (const goal of activeGoals) {
    if (goal.valueId == null) {
      untaggedGoalCount += 1;
      continue;
    }
    taggedCountByValue.set(goal.valueId, (taggedCountByValue.get(goal.valueId) ?? 0) + 1);
  }

  const quietValues = values.filter((value) => (taggedCountByValue.get(value.id) ?? 0) === 0);
  const taggedValueCount = values.length - quietValues.length;
  const majorityUntagged = untaggedGoalCount / activeGoals.length >= 0.5;

  const hasQuietValues = quietValues.length > 0 && taggedValueCount > 0;
  if (!hasQuietValues && !majorityUntagged) return null;

  return {
    quietValues: hasQuietValues ? quietValues : [],
    untaggedGoalCount,
    activeGoalCount: activeGoals.length,
  };
}

/** Calm, non-judgmental copy for the values-check nudge (§13 — no guilt). */
export function valuesCheckLabel(misalignment: ValuesMisalignment): string {
  const { quietValues, untaggedGoalCount, activeGoalCount } = misalignment;

  if (quietValues.length === 1) {
    return `${quietValues[0]!.label} hasn't shown up in your goals lately — worth a glance?`;
  }
  if (quietValues.length > 1) {
    const names = quietValues.map((v) => v.label).join(", ");
    return `${names} have been quiet in your goals lately — worth a glance?`;
  }
  if (untaggedGoalCount >= activeGoalCount) {
    return "Your active goals aren't linked to values yet — a quick pass might help.";
  }
  return "Most of your active goals aren't linked to a value yet — a quick pass might help.";
}
