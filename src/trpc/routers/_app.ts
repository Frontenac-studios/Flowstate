import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { healthChecksRouter } from "./health-checks";
import { meRouter } from "./me";
import { projectsRouter } from "./projects";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  healthChecks: healthChecksRouter,
  me: meRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  timeEntries: timeEntriesRouter,
});

export type AppRouter = typeof appRouter;
