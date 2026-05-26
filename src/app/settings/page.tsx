import Link from "next/link";
import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <section className="glass-panel-opaque space-y-4 px-6 py-8">
        <h1 className="text-lg font-semibold text-kash-ink">Settings</h1>
        <p className="text-kash-ink-muted">
          Bucket mode, accessibility preferences, and sign out — Phase 10.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-kash-accent hover:underline"
            disabled
            title="Sign out — Phase 10"
          >
            Sign out (coming soon)
          </button>
        </form>
        <Link href="/plan" className="inline-block text-sm text-kash-accent hover:underline">
          Back to plan
        </Link>
      </section>
    </PlanLayout>
  );
}
