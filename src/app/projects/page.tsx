import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <div className="glass-panel px-6 py-10 text-center text-kash-ink-muted">
        <h1 className="mb-1 text-lg font-semibold text-kash-ink">Projects</h1>
        <p className="text-sm">A project index lives here soon.</p>
      </div>
    </PlanLayout>
  );
}
