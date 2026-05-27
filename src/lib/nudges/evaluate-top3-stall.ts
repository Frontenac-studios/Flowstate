import {
  calendarDaysBetween,
  getLocalHour,
  nudgeThresholdHour,
  pinReferenceLocalDate,
  startedOnLocalDay,
  toLocalISODate,
} from "./local-time";

export type Top3TaskInput = {
  id: string;
  title: string;
  top3Order: number;
  top3PinnedAt: Date | null;
  scheduledDate: string | null;
  completedAt: Date | null;
};

export type TimeEntryInput = {
  taskId: string;
  startedAt: Date;
};

export type StalledTop3Task = {
  id: string;
  title: string;
  top3Order: number;
};

export type SlippedTop3Task = StalledTop3Task & {
  daysSlipped: number;
  pinReferenceDate: string;
};

export type EvaluateTop3StallInput = {
  now: Date;
  tzOffsetMinutes: number;
  localDate: string;
  top3Tasks: Top3TaskInput[];
  timeEntriesToday: TimeEntryInput[];
  alreadyNudgedToday: boolean;
};

export type EvaluateTop3StallResult = {
  stalledTasks: StalledTop3Task[];
  slippedTasks: SlippedTop3Task[];
  shouldFireStallNudge: boolean;
  localHour: number;
};

const SLIPPED_DAYS_THRESHOLD = 2;

function isIncompleteTop3(task: Top3TaskInput): boolean {
  return task.completedAt === null;
}

export function evaluateTop3Stall(input: EvaluateTop3StallInput): EvaluateTop3StallResult {
  const { now, tzOffsetMinutes, localDate, top3Tasks, timeEntriesToday, alreadyNudgedToday } =
    input;

  const localHour = getLocalHour(now, tzOffsetMinutes);
  const computedLocalDate = toLocalISODate(now, tzOffsetMinutes);
  const effectiveLocalDate = localDate || computedLocalDate;

  const incomplete = top3Tasks.filter(isIncompleteTop3);

  const focusedTodayTaskIds = new Set(
    timeEntriesToday
      .filter((e) => startedOnLocalDay(e.startedAt, effectiveLocalDate, tzOffsetMinutes))
      .map((e) => e.taskId)
  );

  const stalledTasks: StalledTop3Task[] = incomplete
    .filter((t) => !focusedTodayTaskIds.has(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      top3Order: t.top3Order,
    }));

  const slippedTasks: SlippedTop3Task[] = incomplete
    .map((t) => {
      const pinReferenceDate = pinReferenceLocalDate(
        t.top3PinnedAt,
        t.scheduledDate,
        tzOffsetMinutes,
        effectiveLocalDate
      );
      const daysSlipped = calendarDaysBetween(pinReferenceDate, effectiveLocalDate);
      return {
        id: t.id,
        title: t.title,
        top3Order: t.top3Order,
        daysSlipped,
        pinReferenceDate,
      };
    })
    .filter((t) => t.daysSlipped >= SLIPPED_DAYS_THRESHOLD);

  const thresholdHour = nudgeThresholdHour();
  const shouldFireStallNudge =
    localHour >= thresholdHour && stalledTasks.length > 0 && !alreadyNudgedToday;

  return {
    stalledTasks,
    slippedTasks,
    shouldFireStallNudge,
    localHour,
  };
}
