import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { PlanHorizonView } from "@/components/kash/plan/PlanHorizonView";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function PlanningPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <AppShell>
      <ContextualInbox />
      <PlanHorizonView />
    </AppShell>
  );
}
