import { redirect } from "next/navigation";

import ProjectsIndex from "@/components/kash/projects/ProjectsIndex";
import ProjectsLayout from "@/components/kash/projects/ProjectsLayout";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  return (
    <ProjectsLayout>
      <ProjectsIndex />
    </ProjectsLayout>
  );
}
