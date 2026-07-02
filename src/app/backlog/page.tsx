import { redirect } from "next/navigation";

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
      <AbyssRoot />
    </AppShell>
  );
}
