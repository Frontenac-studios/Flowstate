import Link from "next/link";
import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { createClient } from "@/lib/supabase/server";

export default async function FocusPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <section className="glass-panel px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-kash-ink">Focus mode</h1>
        <p className="mt-2 text-kash-ink-muted">Coming in Phase 5 — RDM + focus takeover.</p>
        <Link
          href="/plan"
          className="glass-pill mt-6 inline-block px-3 py-1.5 text-sm font-medium text-kash-ink-muted transition hover:text-kash-ink"
        >
          Back to plan
        </Link>
      </section>
    </PlanLayout>
  );
}
