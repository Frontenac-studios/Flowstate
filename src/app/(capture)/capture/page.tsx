import { notFound, redirect } from "next/navigation";

import { CapturePanel } from "@/components/kash/capture/CapturePanel";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { getVerifiedUser } from "@/lib/auth/verify-jwt";
import { FLAGS } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";

/**
 * The global capture panel (W17, MISSION desktop pillar 2). Rendered into the
 * shell's `capture` window, which ⌘⇧K shows over whatever app you're in.
 */
export default async function CapturePage() {
  if (!FLAGS.capturePanel) notFound();

  const supabase = createClient();
  const user = await getVerifiedUser(supabase);

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return <CapturePanel />;
}
