import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { categorySettingsRouter } from "./category-settings";
import { chatRouter } from "./chat";
import { dayReviewsRouter } from "./day-reviews";
import { focusBlocksRouter } from "./focus-blocks";
import { healthChecksRouter } from "./health-checks";
import { meRouter } from "./me";
import { phasesRouter } from "./phases";
import { projectsRouter } from "./projects";
import { settingsRouter } from "./settings";
import { taskBulkImportsRouter } from "./task-bulk-imports";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";
import { syncRouter } from "./sync";
import { weekDraftRouter } from "./week-draft";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  categorySettings: categorySettingsRouter,
  chat: chatRouter,
  dayReviews: dayReviewsRouter,
  focusBlocks: focusBlocksRouter,
  healthChecks: healthChecksRouter,
  me: meRouter,
  phases: phasesRouter,
  projects: projectsRouter,
  settings: settingsRouter,
  sync: syncRouter,
  taskBulkImports: taskBulkImportsRouter,
  tasks: tasksRouter,
  timeEntries: timeEntriesRouter,
  weekDraft: weekDraftRouter,
});

export type AppRouter = typeof appRouter;
