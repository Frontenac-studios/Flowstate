import { isHeavyTask } from "@/lib/week/task-load-weight";
import { weightedProgress, type WeightedProgress } from "./weighted-progress";

export type ProgressTaskShape = {
  id: string;
  completedAt: Date | null;
  isTop3: boolean;
};

export function isHeavyForProgress(
  task: Pick<ProgressTaskShape, "id" | "isTop3">,
  dayPriorityTaskIds: ReadonlySet<string>
): boolean {
  return isHeavyTask({
    isTop3: task.isTop3,
    dayPriorityOrder: dayPriorityTaskIds.has(task.id) ? 1 : null,
  });
}

export function weightedProgressForTasks(
  tasks: readonly ProgressTaskShape[],
  dayPriorityTaskIds: ReadonlySet<string>
): WeightedProgress {
  return weightedProgress(
    tasks.map((task) => ({
      completed: task.completedAt != null,
      isHeavy: isHeavyForProgress(task, dayPriorityTaskIds),
    }))
  );
}
