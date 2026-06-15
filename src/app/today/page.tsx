import { redirect } from "next/navigation";

import { PlanCanvas } from "@/components/kash/plan/PlanCanvas";
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
      <PlanCanvas />
    </PlanLayout>
  );
}
