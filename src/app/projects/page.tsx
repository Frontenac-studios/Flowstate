import { redirect } from "next/navigation";

import ProjectsIndex from "@/components/kash/projects/ProjectsIndex";
import ProjectsLayout from "@/components/kash/projects/ProjectsLayout";
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
    <ProjectsLayout>
      <ProjectsIndex />
    </ProjectsLayout>
  );
}
