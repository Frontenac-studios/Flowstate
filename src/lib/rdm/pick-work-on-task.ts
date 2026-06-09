import { nudgeThresholdHour } from "@/lib/nudges/local-time";

export type WorkOnPickTask = {
  id: string;
  title: string;
  isTop3: boolean;
  priority: number;
  top3Order: number | null;
  completedAt: Date | null;
};

export type StalledTop3Input = {
  id: string;
  title: string;
  top3Order: number;
};

export type PickWorkOnOptions = {
  localHour: number;
  dayStartHour: number;
  dayEndHour: number;
  lastWasLarge?: boolean;
  stalledTop3?: StalledTop3Input[];
};

export type PickWorkOnResult = {
  id: string;
  title: string;
  isTop3: boolean;
  pickReason: string;
};

export type PickWorkOnOutput = {
  pick: PickWorkOnResult | null;
  stalledTop3: StalledTop3Input[];
};

function weightedRandomPick<T>(items: T[], weights: number[]): T | null {
  if (items.length === 0) return null;
  if (items.length !== weights.length) return items[0] ?? null;

  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return items[0] ?? null;

  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }

  return items[items.length - 1] ?? null;
}

function dayProgress(localHour: number, dayStartHour: number, dayEndHour: number): number {
  if (localHour <= dayStartHour) return 0;
  if (localHour >= dayEndHour) return 1;
  return (localHour - dayStartHour) / (dayEndHour - dayStartHour);
}

/** Linear 1.5 → 4.0 from day start to day end. */
export function computeTop3Boost(
  localHour: number,
  dayStartHour: number,
  dayEndHour: number
): number {
  const progress = dayProgress(localHour, dayStartHour, dayEndHour);
  return 1.5 + progress * 2.5;
}

function buildPickReason(task: WorkOnPickTask): string {
  if (task.isTop3 && task.priority > 0) {
    return "it's Top 3 and higher priority on your list";
  }
  if (task.isTop3) {
    return "it's Top 3";
  }
  if (task.priority > 0) {
    return "highest priority on your list today";
  }
  return "next on your list";
}

export function computeWorkOnWeight(
  task: WorkOnPickTask,
  options: PickWorkOnOptions,
  stalledTop3Ids: Set<string>
): number {
  const { localHour, dayStartHour, dayEndHour, lastWasLarge = false } = options;

  let weight = task.priority + 1;

  if (task.isTop3) {
    weight *= computeTop3Boost(localHour, dayStartHour, dayEndHour);
  }

  const sizeWeight = lastWasLarge ? (task.isTop3 ? 1 : 3) : task.isTop3 ? 3 : 1;
  weight *= sizeWeight;

  if (task.isTop3 && localHour >= nudgeThresholdHour() && stalledTop3Ids.has(task.id)) {
    weight *= 1.5;
  }

  return weight;
}

export function pickWorkOnTask(
  tasks: WorkOnPickTask[],
  options: PickWorkOnOptions
): PickWorkOnOutput {
  const stalledTop3 = options.stalledTop3 ?? [];
  const stalledTop3Ids = new Set(stalledTop3.map((t) => t.id));

  const eligible = tasks.filter((t) => t.completedAt === null);
  if (eligible.length === 0) {
    return { pick: null, stalledTop3 };
  }

  const weights = eligible.map((t) => computeWorkOnWeight(t, options, stalledTop3Ids));
  const chosen = weightedRandomPick(eligible, weights);

  if (!chosen) {
    return { pick: null, stalledTop3 };
  }

  return {
    pick: {
      id: chosen.id,
      title: chosen.title,
      isTop3: chosen.isTop3,
      pickReason: buildPickReason(chosen),
    },
    stalledTop3,
  };
}
