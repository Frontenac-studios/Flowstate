import "server-only";

import type { QueryClient } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query/create-options-proxy";
import { headers } from "next/headers";
import { cache } from "react";

import { createTRPCContext } from "./init";
import type { AppRouter } from "./routers/_app";
import { appRouter } from "./routers/_app";

const getTRPCContext = cache(async () =>
  createTRPCContext({
    headers: await headers(),
  })
);

export function createServerTRPC(queryClient: QueryClient) {
  return createTRPCOptionsProxy<AppRouter>({
    router: appRouter,
    ctx: getTRPCContext,
    queryClient,
  });
}

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

/** Resolve planning year from `?year=` (defaults to current calendar year). */
export function resolvePlanPageYear(searchParams: { year?: string | string[] }): number {
  const raw = Array.isArray(searchParams.year) ? searchParams.year[0] : searchParams.year;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= YEAR_MIN && parsed <= YEAR_MAX) {
      return parsed;
    }
  }
  return new Date().getFullYear();
}

/**
 * Browser-local offset for `getYearActivity` (matches YearView `clientTzOffsetMinutes`).
 * On the server this is the **host** offset (often UTC on Vercel), not the visitor's zone.
 * The query key includes `tzOffsetMinutes`, so the client refetches when offsets differ.
 */
export function serverTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** Prefetch queries shared by YearView and QuarterView for the given card year. */
export async function prefetchPlanPageQueries(
  queryClient: QueryClient,
  input: { year: number }
): Promise<void> {
  const trpc = createServerTRPC(queryClient);
  const tzOffsetMinutes = serverTzOffsetMinutes();
  const { year } = input;

  await Promise.all([
    queryClient.prefetchQuery(trpc.planning.listGoals.queryOptions({ cardYear: year })),
    queryClient.prefetchQuery(trpc.planning.listQuarterThemes.queryOptions({ year })),
    queryClient.prefetchQuery({
      ...trpc.planning.getYearActivity.queryOptions({ year, tzOffsetMinutes }),
      staleTime: 5 * 60 * 1000,
    }),
  ]);
}
