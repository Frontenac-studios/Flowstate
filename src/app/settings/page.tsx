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

        <section className="glass-panel rounded-xl p-4">
          <h2 className="text-sm font-semibold text-kash-ink">Claude (AI companion)</h2>
          <p className="mt-2 text-sm text-kash-ink-muted">
            Kash uses Claude for chat and focus narration. In v1 the API key is set by your
            deployment environment, not in this UI.
          </p>
          <p className="mt-2 text-sm text-kash-ink-muted">
            Add <code className="text-kash-ink">ANTHROPIC_API_KEY</code> to{" "}
            <code className="text-kash-ink">.env.local</code> (see{" "}
            <code className="text-kash-ink">.env.example</code>). Optional:{" "}
            <code className="text-kash-ink">ANTHROPIC_MODEL</code> to override the default model.
          </p>
        </section>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="glass-btn-ghost text-sm"
            disabled
            title="Sign out — Phase 10"
          >
            Sign out (coming soon)
          </button>
        </form>
        <Link
          href="/plan"
          className="glass-pill inline-block px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
        >
          Back to plan
        </Link>
      </section>
    </PlanLayout>
  );
}
