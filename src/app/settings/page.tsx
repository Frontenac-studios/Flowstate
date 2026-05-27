import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { SettingsForm } from "@/components/kash/settings/SettingsForm";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <SettingsForm />
    </PlanLayout>
  );
}
