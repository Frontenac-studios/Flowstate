import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { healthChecksRouter } from "./health-checks";
import { meRouter } from "./me";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  healthChecks: healthChecksRouter,
  me: meRouter,
});

export type AppRouter = typeof appRouter;
