import { redirect } from "next/navigation";

import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";
import { FocusLayout } from "@/components/kash/focus/FocusLayout";
import { FocusCanvas } from "@/components/kash/focus/FocusCanvas";

export default async function FocusPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <FocusLayout>
      <FocusCanvas />
    </FocusLayout>
  );
}
