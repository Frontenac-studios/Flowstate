import type { ProjectProgressRow } from "@/lib/projects/aggregate-project-phase-progress";
import { categorySeedLabel } from "@/lib/projects/category-tokens";
import { formatDuration } from "@/lib/time/duration";

export type EowTemplateInput = {
  totalSeconds: number;
  completionsThisWeek: number;
  byCategory: ReadonlyArray<{ category: string; seconds: number }>;
  byProject: ReadonlyArray<{ projectName: string | null; seconds: number }>;
  projectProgress: readonly ProjectProgressRow[];
};

export function templateEowReview(input: EowTemplateInput): { summary: string } {
  const focusMinutes = Math.round(input.totalSeconds / 60);
  const focusLine =
    input.totalSeconds === 0
      ? "No focus time was logged this week."
      : `You logged about **${focusMinutes}** minute${focusMinutes === 1 ? "" : "s"} of focus this week.`;

  const completionLine =
    input.completionsThisWeek === 0
      ? "No tasks were completed this week."
      : `You finished **${input.completionsThisWeek}** task${input.completionsThisWeek === 1 ? "" : "s"} this week.`;

  const topCategory = input.byCategory[0];
  const categoryLine = topCategory
    ? `Most focus went to **${categorySeedLabel(topCategory.category as never)}** (${formatDuration(topCategory.seconds)}).`
    : "";

  const progressed = input.projectProgress.filter((row) => row.percent > 0);
  const progressLine =
    progressed.length === 0
      ? ""
      : `Project momentum: ${progressed
          .slice(0, 3)
          .map((row) => `**${row.projectName}** at ${row.percent}%`)
          .join(", ")}.`;

  const summary = [completionLine, focusLine, categoryLine, progressLine].filter(Boolean).join(" ");

  return { summary };
}
