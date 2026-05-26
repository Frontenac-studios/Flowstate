import { redirect } from "next/navigation";

import { EmptyPlanState } from "@/components/kash/EmptyPlanState";
import { PlanLayout } from "@/components/kash/PlanLayout";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <EmptyPlanState />
    </PlanLayout>
  );
}
