import { redirect } from "next/navigation";

import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { getVerifiedUser } from "@/lib/auth/verify-jwt";
import { createClient } from "@/lib/supabase/server";
import { FocusLayout } from "@/components/kash/focus/FocusLayout";
import { FocusCanvas } from "@/components/kash/focus/FocusCanvas";

export default async function FocusPage() {
  const supabase = createClient();
  const user = await getVerifiedUser(supabase);

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <FocusLayout>
      <FocusCanvas />
    </FocusLayout>
  );
}
