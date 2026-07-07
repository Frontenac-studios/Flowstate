import "server-only";

import { resolveAuthContext } from "@/lib/auth/auth-bypass";
import { getVerifiedUser } from "@/lib/auth/verify-jwt";
import { createClient } from "@/lib/supabase/server";

export async function getRouteUserId(): Promise<string | null> {
  const supabase = createClient();
  const user = await getVerifiedUser(supabase);
  return resolveAuthContext(user)?.userId ?? null;
}
