import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/kash/AppShell";
import AbyssRoot from "@/components/kash/abyss/AbyssRoot";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function BacklogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <AppShell>
      <Suspense fallback={<p className="text-ink-muted">Loading backlog…</p>}>
        <AbyssRoot />
      </Suspense>
    </AppShell>
  );
}
