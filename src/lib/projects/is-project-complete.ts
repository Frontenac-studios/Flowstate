import { projectProgress } from "./project-progress";

type ProjectCompletionRow = {
  taskCount: number;
  completedCount: number;
};

/** A project is complete when it has tasks and every task is done. */
export function isProjectComplete(project: ProjectCompletionRow): boolean {
  const { percent, total } = projectProgress(project.completedCount, project.taskCount);
  return total > 0 && percent === 100;
}
