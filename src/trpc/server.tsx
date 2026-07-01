import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCallerFactory, createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";

/** Per-request QueryClient; dehydrate uses superjson via `makeQueryClient`. */
export const getQueryClient = cache(makeQueryClient);

export {
  createServerTRPC,
  prefetchPlanPageQueries,
  resolvePlanPageYear,
  serverTzOffsetMinutes,
} from "./prefetch";

const createCaller = createCallerFactory(appRouter);

/** Type-safe tRPC caller for Server Components (avoids bundling the React Query proxy). */
export const getTRPCCaller = cache(async () =>
  createCaller(
    await createTRPCContext({
      headers: await headers(),
    })
  )
);
