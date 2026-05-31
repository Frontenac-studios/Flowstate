import { TRPCError } from "@trpc/server";
import { notFound, redirect } from "next/navigation";

import ProjectWorkspace from "@/components/kash/projects/ProjectWorkspace";
import ProjectsLayout from "@/components/kash/projects/ProjectsLayout";
import type { ProjectDetail } from "@/components/kash/projects/types";
import { createClient } from "@/lib/supabase/server";
import { getTRPCCaller } from "@/trpc/server";

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

  const caller = await getTRPCCaller();
  let project: ProjectDetail;
  try {
    project = await caller.projects.getById({ id });
  } catch (error) {
    // A missing project or a malformed id both resolve to a 404.
    if (
      error instanceof TRPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <ProjectsLayout>
      <ProjectWorkspace project={project} />
    </ProjectsLayout>
  );
}
