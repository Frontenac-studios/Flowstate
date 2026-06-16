import { redirect } from "next/navigation";

import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user || isAuthBypassed() ? "/today" : "/login");
}
