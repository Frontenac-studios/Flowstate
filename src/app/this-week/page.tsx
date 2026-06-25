import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";
import { WeekCanvas } from "@/components/kash/plan/week/WeekCanvas";
import WeeklySummaryCard from "@/components/kash/week/WeeklySummaryCard";
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
        <div className="mb-4">
          <WeeklySummaryCard />
        </div>
        <LensProvider scope="this-week">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <LensControlBar />
          </div>
          <WeekCanvas />
        </LensProvider>
      </PlanSurface>
    </AppShell>
  );
}
