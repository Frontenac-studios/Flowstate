import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

type Props = {
  queryClient: QueryClient;
  children: React.ReactNode;
};

/** Dehydrates a per-request QueryClient (see `makeQueryClient` superjson dehydrate config). */
export function TRPCHydrate({ queryClient, children }: Props) {
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
