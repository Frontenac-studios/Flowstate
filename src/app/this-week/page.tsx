import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { ThisWeekSurface } from "@/components/kash/plan/week/ThisWeekSurface";
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
      <ThisWeekSurface />
    </AppShell>
  );
}
