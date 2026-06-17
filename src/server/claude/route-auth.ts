import "server-only";

import { resolveAuthContext } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export async function getRouteUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return resolveAuthContext(user)?.userId ?? null;
}
