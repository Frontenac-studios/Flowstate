import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { aboutMeRouter } from "./about-me";
import { abyssRouter } from "./abyss";
import { careRouter } from "./care";
import { categorySettingsRouter } from "./category-settings";
import { chatRouter } from "./chat";
import { dayReviewsRouter } from "./day-reviews";
import { dependenciesRouter } from "./dependencies";
import { focusBlocksRouter } from "./focus-blocks";
import { healthChecksRouter } from "./health-checks";
import { meRouter } from "./me";
import { phasesRouter } from "./phases";
import { planningRouter } from "./planning";
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

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  aboutMe: aboutMeRouter,
  abyss: abyssRouter,
  care: careRouter,
  categorySettings: categorySettingsRouter,
  chat: chatRouter,
  dayReviews: dayReviewsRouter,
  dependencies: dependenciesRouter,
  focusBlocks: focusBlocksRouter,
  healthChecks: healthChecksRouter,
  me: meRouter,
  phases: phasesRouter,
  planning: planningRouter,
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
});

export type AppRouter = typeof appRouter;
