import { redirect } from "next/navigation";

import { PlanLayout } from "@/components/kash/PlanLayout";
import { ProjectsIndex } from "@/components/kash/projects/ProjectsIndex";
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
      <ProjectsIndex />
    </PlanLayout>
  );
}
