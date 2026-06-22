import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";
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
    <AppShell>
      <PlanSurface>
        <ContextualInbox />
        <LensProvider scope="this-week">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <LensControlBar />
          </div>
          <ThisWeekCanvas />
        </LensProvider>
      </PlanSurface>
    </AppShell>
  );
}
