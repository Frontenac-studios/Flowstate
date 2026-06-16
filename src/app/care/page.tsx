import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { CareView } from "@/components/kash/care/CareView";
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
      <CareView />
    </AppShell>
  );
}
