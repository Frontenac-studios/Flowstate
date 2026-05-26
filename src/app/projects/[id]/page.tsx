import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PlanLayout>
      <section className="glass-panel-opaque px-6 py-10">
        <h1 className="text-lg font-semibold text-kash-ink">Project</h1>
        <p className="mt-2 text-kash-ink-muted">
          Project workspace for <code className="font-mono text-sm">{id}</code> is not built yet.
          Miller columns, object tree, and calendar board are planned for a later release.
        </p>
      </section>
    </PlanLayout>
  );
}
