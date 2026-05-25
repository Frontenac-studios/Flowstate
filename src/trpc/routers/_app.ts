import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { healthChecksRouter } from "./health-checks";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  healthChecks: healthChecksRouter,
});

export type AppRouter = typeof appRouter;
