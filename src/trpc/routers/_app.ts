import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { abyssRouter } from "./abyss";
import { careRouter } from "./care";
import { calendarRouter } from "./calendar";
import { categorySettingsRouter } from "./category-settings";
import { chatRouter } from "./chat";
import { dayReviewsRouter } from "./day-reviews";
import { focusBlocksRouter } from "./focus-blocks";
import { meRouter } from "./me";
import { phasesRouter } from "./phases";
import { planningRouter } from "./planning";
import { projectMilestonesRouter } from "./project-milestones";
import { projectsRouter } from "./projects";
import { protectedBlocksRouter } from "./protected-blocks";
import { recurrenceRouter } from "./recurrence";
import { settingsRouter } from "./settings";
import { taskBulkImportsRouter } from "./task-bulk-imports";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";
import { syncRouter } from "./sync";
import { weekDraftRouter } from "./week-draft";
import { weekDayPrioritiesRouter } from "./week-day-priorities";
import { weekOverCommitRouter } from "./week-over-commit";
import { weekReviewsRouter } from "./week-reviews";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  abyss: abyssRouter,
  care: careRouter,
  calendar: calendarRouter,
  categorySettings: categorySettingsRouter,
  chat: chatRouter,
  dayReviews: dayReviewsRouter,
  focusBlocks: focusBlocksRouter,
  me: meRouter,
  phases: phasesRouter,
  planning: planningRouter,
  projectMilestones: projectMilestonesRouter,
  projects: projectsRouter,
  protectedBlocks: protectedBlocksRouter,
  recurrence: recurrenceRouter,
  settings: settingsRouter,
  sync: syncRouter,
  taskBulkImports: taskBulkImportsRouter,
  tasks: tasksRouter,
  timeEntries: timeEntriesRouter,
  weekDraft: weekDraftRouter,
  weekDayPriorities: weekDayPrioritiesRouter,
  weekOverCommit: weekOverCommitRouter,
  weekReviews: weekReviewsRouter,
});

export type AppRouter = typeof appRouter;
