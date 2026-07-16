import { PlanHorizonView } from "@/components/kash/plan/PlanHorizonView";
import { TRPCHydrate } from "@/trpc/hydrate";
import { getQueryClient, prefetchPlanPageQueries, resolvePlanPageYear } from "@/trpc/server";

type Props = {
  searchParams: Promise<{ year?: string; quarter?: string }>;
};

export default async function PlanningPage({ searchParams }: Props) {
  const params = await searchParams;
  const year = resolvePlanPageYear(params);

  const queryClient = getQueryClient();
  await prefetchPlanPageQueries(queryClient, { year });

  return (
    <TRPCHydrate queryClient={queryClient}>
      <PlanHorizonView />
    </TRPCHydrate>
  );
}
