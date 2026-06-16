import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function CarePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <AppShell>
      <div className="glass-panel p-8 text-kash-ink-muted">
        <h1 className="text-lg font-semibold text-kash-ink">Care</h1>
        <p className="mt-2 text-sm">
          Walks, breathing, and reflections to keep you balanced. Coming soon.
        </p>
      </div>
    </AppShell>
  );
}
