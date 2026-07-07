import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Desktop-first, ~15-query Today fan-out: keep data fresh long enough to
        // avoid refetch storms, but short enough that reopening the app reconciles.
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        // Focus-refetching every stale query is pure overhead in a desktop app;
        // mutations already invalidate the keys they touch.
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        // A failing mutation retrying delays error surfacing on the hot path.
        retry: 0,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
