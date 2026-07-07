import { redirect } from "next/navigation";

import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { getVerifiedUser } from "@/lib/auth/verify-jwt";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const user = await getVerifiedUser(supabase);

  redirect(user || isAuthBypassed() ? "/today" : "/login");
}
