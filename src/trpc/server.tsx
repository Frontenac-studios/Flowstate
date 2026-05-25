import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCallerFactory, createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";

export const getQueryClient = cache(makeQueryClient);

const createCaller = createCallerFactory(appRouter);

/** Type-safe tRPC caller for Server Components (avoids bundling the React Query proxy). */
export const getTRPCCaller = cache(async () =>
  createCaller(
    await createTRPCContext({
      headers: await headers(),
    })
  )
);
