import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { SettingsForm } from "@/components/kash/settings/SettingsForm";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <AppShell>
      <SettingsForm />
    </AppShell>
  );
}
