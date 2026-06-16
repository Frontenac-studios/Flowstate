import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { ThisWeekCanvas } from "@/components/kash/plan/ThisWeekCanvas";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function ThisWeekPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <ThisWeekCanvas />
    </PlanLayout>
  );
}
