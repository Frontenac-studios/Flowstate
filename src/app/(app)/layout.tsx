import { redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { getVerifiedUser } from "@/lib/auth/verify-jwt";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const user = await getVerifiedUser(supabase);

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
