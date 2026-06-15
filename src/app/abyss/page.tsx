import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { createClient } from "@/lib/supabase/server";

export default async function AbyssPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <div className="glass-panel p-8 text-kash-ink-muted">
        <h1 className="text-lg font-semibold text-kash-ink">The Abyss</h1>
        <p className="mt-2 text-sm">
          A tended home for backburner ideas and deferred tasks. Coming soon.
        </p>
      </div>
    </PlanLayout>
  );
}
