import { redirect } from "next/navigation";

import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { PlanHorizonView } from "@/components/kash/plan/PlanHorizonView";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";
import { TRPCHydrate } from "@/trpc/hydrate";
import { getQueryClient, prefetchPlanPageQueries, resolvePlanPageYear } from "@/trpc/server";

type Props = {
  searchParams: Promise<{ year?: string; quarter?: string }>;
};

export default async function PlanningPage({ searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  const params = await searchParams;
  const year = resolvePlanPageYear(params);

  const queryClient = getQueryClient();
  await prefetchPlanPageQueries(queryClient, { year });

  return (
    <TRPCHydrate queryClient={queryClient}>
      <ContextualInbox />
      <PlanHorizonView />
    </TRPCHydrate>
  );
}
