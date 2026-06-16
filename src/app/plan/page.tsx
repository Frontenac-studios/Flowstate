import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
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
      <div className="glass-panel p-8 text-kash-ink-muted">
        <h1 className="text-lg font-semibold text-kash-ink">Plan</h1>
        <p className="mt-2 text-sm">
          Long-horizon planning (month / quarter / year) lands here. Coming soon.
        </p>
      </div>
    </AppShell>
  );
}
