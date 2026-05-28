import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { chatRouter } from "./chat";
import { dayReviewsRouter } from "./day-reviews";
import { healthChecksRouter } from "./health-checks";
import { meRouter } from "./me";
import { projectsRouter } from "./projects";
import { settingsRouter } from "./settings";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";
import { syncRouter } from "./sync";
import { weekDraftRouter } from "./week-draft";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  chat: chatRouter,
  dayReviews: dayReviewsRouter,
  healthChecks: healthChecksRouter,
  me: meRouter,
  projects: projectsRouter,
  settings: settingsRouter,
  sync: syncRouter,
  tasks: tasksRouter,
  timeEntries: timeEntriesRouter,
  weekDraft: weekDraftRouter,
});

export type AppRouter = typeof appRouter;
